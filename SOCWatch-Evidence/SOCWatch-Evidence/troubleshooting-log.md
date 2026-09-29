# Troubleshooting Log

Format per entry: Symptom / Investigation / Root cause / Fix / Prevention. Date each one at the time it happens.

## 2026-09-22 — Terraform plan fails with "No valid credential sources found"

**Symptom:** `terraform plan` in `infra/` fails immediately with:
```
Error: No valid credential sources found
Error: failed to refresh cached credentials, no EC2 IMDS role found,
operation error ec2imds: GetMetadata, request canceled, context deadline exceeded
```

**Investigation:** `aws configure list-profiles` returns empty and `aws sts get-caller-identity` (default and `--profile socwatch`) both fail with no credentials found. Confirmed the IAM user `socwatch-admin` exists in the AWS account (created via console) and its access-key CSV was downloaded, but being logged into the AWS Console in a browser session does not populate local AWS CLI credentials — they're separate credential stores. Terraform's AWS provider here uses the default credential chain (no `profile` argument in `main.tf`), so it needs either `~/.aws/credentials` populated or `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` env vars set.

**Root cause:** `aws configure --profile socwatch` has not actually been run (or completed) in this local shell environment, despite the IAM access key already being generated.

**Fix:** Run `aws configure --profile socwatch` locally with the Access Key ID (see local credentials file, not tracked in git) and the secret from the downloaded CSV, region `ap-south-1`, output `json`. Then either export `AWS_PROFILE=socwatch` or add `profile = "socwatch"` to the `provider "aws"` block in `main.tf` before `terraform plan`.

**Prevention:** Verify with `aws sts get-caller-identity --profile socwatch` immediately after running `aws configure`, before assuming credentials are in place — a browser AWS Console login is not evidence that CLI credentials exist.

**Also fixed same session:** `terraform.tfvars` had a stale `my_ip` (`203.189.189.251/32`) from a previous session; current public IP checked via `curl -s https://checkip.amazonaws.com` was `203.189.189.242` and the tfvars updated accordingly, since the security group locks SSH/RDP to this value.

## 2026-09-22 — Pivoted from Terraform to manual console provisioning for Week 2

**Symptom:** While the local `terraform apply` path stayed blocked on missing AWS CLI credentials, the account owner provisioned the Week 2 infrastructure directly through the AWS Console (EC2 launch wizard).

**Investigation:** Confirmed via the console (logged in as `socwatch-admin`) that all 4 required instances already exist and are correctly tagged/named, the security group has all 5 required inbound rules with the correct scoping (no `0.0.0.0/0` on admin ports), and the manager's port 443 responds with a TLS handshake consistent with Wazuh already being installed.

**Root cause:** Not a failure — a deliberate workaround. CLI/Terraform credentials never got configured locally, so the console (which the account owner already had valid access to) was used instead to keep the project moving without waiting on that blocker.

**Fix:** None needed — the infrastructure meets the same requirements the Terraform config specifies (same VPC CIDR intent, same SG rules, same 4 roles), just with AWS's own auto-generated naming/IP scheme and a couple of instance-type substitutions (manager is `m7i-flex.large` instead of `t3.medium`). Real values captured in `instance-inventory.md`.

**Prevention / going forward:** `infra/main.tf` is kept in the repo as a reference IaC implementation (and as evidence of Terraform competency for the report) but is no longer the active deployment path. Do not run `terraform apply` against this AWS account without first reconciling — it has no state entry for these resources and would attempt to create duplicates. The gap this exposed: no Elastic IP was allocated for the manager during manual provisioning (Terraform's plan included one, the manual click-through missed it) — public IP will change on every stop/start until one is added.

## 2026-09-22 — Wazuh manager disk-full outage

**Symptom:** Dashboard unreachable (connection failures), and SSH to the manager itself became slow/unreliable. `wazuh-manager.service` was not running.

**Investigation:**
1. `df -h /` on the manager showed the 28GB root disk at 100% used.
2. `sudo systemctl status wazuh-manager` showed the service had crashed with `No space left on device` while writing its PID file.
3. `sudo systemctl status wazuh-indexer` showed the service stuck in `activating` state for 10+ hours; the indexer's own log showed `IOException: No space left on device` on startup.
4. `sudo du -sh /var/ossec/queue/vd_updater /var/ossec/queue/vd` identified the culprit: `/var/ossec/queue/vd_updater/tmp/contents` held 8.1GB of stale temp files from repeatedly failed vulnerability-feed downloads, and `/var/ossec/queue/vd/feed` held another 8GB of corrupted feed cache from the same failed downloads. Matches `ossec.log` entries `content-updater: WARNING: Offset processing failed` / `Failed writing received data to disk`.

**Root cause:** The vulnerability-detection feed updater kept retrying a failed download into an already-full disk, growing the stale-temp-file problem instead of failing cleanly.

**Fix:** `sudo find /var/ossec/queue/vd_updater/tmp/contents -type f -delete` and `sudo find /var/ossec/queue/vd/feed -mindepth 1 -delete` freed the disk from 100% to 43% used. Then `sudo systemctl reset-failed wazuh-manager && sudo systemctl start wazuh-manager` brought the manager back, and `sudo systemctl restart wazuh-indexer` cleared the stuck indexer. Both already-enrolled Linux agents auto-reconnected within ~15 seconds, no agent-side action needed. (A secondary symptom — the dashboard returning 503 briefly even after disk space was freed, caused by OpenSearch's `read_only_allow_delete` flood-stage block — cleared on its own within ~10 seconds of the indexer restart, consistent with documented OpenSearch behaviour once usage drops below the high watermark.)

**Prevention:** This was cleared once but the root cause (the feed updater retrying into a full disk) was not permanently fixed — only the symptom was cleaned up. Check `sudo du -sh /var/ossec/queue/vd_updater /var/ossec/queue/vd` at the start of every session; disk usage as of 2026-09-24 is a healthy 40% (35GB free).

## 2026-09-22/23 — Security group had to be opened to 0.0.0.0/0 on admin ports

**Symptom:** SSH/RDP/HTTPS access to the lab kept dropping unpredictably, even after the security group's SSH/RDP/HTTPS source had already been widened once from a `/32` to a `/21` CIDR block to cover the account owner's mobile ISP.

**Investigation:** Checked the current public IP repeatedly (`curl -s https://checkip.amazonaws.com`) and found it rotating between multiple different /24 blocks — e.g. `203.189.189.229`, `.242`, `.251`, and a separate block entirely, `203.189.185.158` — within the same few minutes. Confirmed via APNIC RDAP that all observed IPs belong to the same mobile carrier (Hutchison Telecommunications Lanka), indicating carrier-grade NAT (CGNAT) across a pool wider than a /21. Ruled out NACLs (open), instance health (fine), and tried a reboot — none of these were the cause.

**Root cause:** The account owner's mobile internet connection uses CGNAT across an IP pool too large for any practical CIDR restriction — a `/32` or even `/21` rule is fundamentally unworkable for this specific connection.

**Fix:** Widened the SSH (22), RDP (3389), and HTTPS (443) inbound rules on `sg-0852845171781156b` to `0.0.0.0/0`. This was a deliberate, discussed tradeoff — not an oversight — made after ruling out narrower alternatives. SSH key-based auth and dashboard/Windows login remain the actual access control; only the network-layer restriction was relaxed. The two VPC-internal agent-traffic rules (1514, 1515) were left correctly scoped to `10.0.0.0/16` throughout.

**Prevention:** Documented explicitly in the report's security-design section as a conscious risk tradeoff with its justification, rather than leaving it looking like an unexplained gap. Should the account owner's network stabilise before the final demo, this can be narrowed back down — but should not be silently re-narrowed without checking first, since it would break access again.

## 2026-09-23/24 — Windows agent appeared installed but was never actually there

**Symptom:** In an earlier session, the account owner reported RDP'ing into `agent-windows-1`, running the MSI install, and confirming `Get-Service WazuhSvc` showed the service running. However, the manager's `agent_control -l` never showed a third (Windows) agent, and `ossec.log` showed zero enrolment attempts from the Windows box's private IP.

**Investigation:** Used AWS Systems Manager Run Command (`AWS-RunPowerShellScript`) to run diagnostics directly on `agent-windows-1` without needing a new RDP session:
```powershell
Get-Content "C:\Program Files (x86)\ossec-agent\ossec.log" -Tail 30
Get-Service WazuhSvc
```
Both commands failed with "cannot find path" / "cannot find any service with service name 'WazuhSvc'" — the Wazuh agent had never actually been installed on this instance. The earlier "it's running" report did not reflect this instance's real state (likely a different or stale RDP window was checked).

**Root cause:** The MSI install never actually completed or ran successfully in the earlier session, despite appearing to from the account owner's side.

**Fix:** Reinstalled remotely via SSM Run Command rather than RDP, using a more robust invocation than the runbook's original backtick-line-continuation style:
```powershell
$msiArgs = @('/i', "$env:TEMP\wazuh-agent.msi", '/q', 'WAZUH_MANAGER=10.0.8.82', 'WAZUH_AGENT_NAME=agent-windows-1')
Start-Process msiexec.exe -ArgumentList $msiArgs -Wait -PassThru
```
Confirmed success both ways: `msiexec exit code: 0` and `WazuhSvc` running on the agent side; `wazuh-authd: Received request for a new agent (agent-windows-1)` and a generated key in the manager's `ossec.log`; and `agent_control -l` showing agent ID 003 (`agent-windows-1`) as `Active`.

**Prevention:** Don't trust "it's done" claims about remote machine state without independent verification — check the authoritative side (the manager's agent list and logs) rather than the machine being configured. Where available, prefer a scriptable remote-execution path (SSM Run Command) over an interactive RDP/SSH session for installs like this, since it produces a durable command-output record rather than relying on a person's summary of what they saw.

## 2026-09-24 — Post-restart health check confirms full lab recovery, closes the last Week 4 gap

**Symptom:** All 4 instances had been stopped (the standard end-of-session billing practice) since the previous session. Needed to confirm the whole stack — manager services, all 3 agents, and Windows Event Log ingestion specifically — comes back cleanly on restart, since Windows Event Log ingestion had never been separately verified beyond the initial "agent started" heartbeat.

**Investigation:** Started all 4 instances from the EC2 console. SSH'd to the manager immediately after boot: `wazuh-manager`/`wazuh-indexer` briefly showed `activating` (expected right after boot) while `wazuh-dashboard` was already `active`; all three settled to `active` within about a minute. `agent_control -l` showed 001/002 as `Disconnected`/`Pending` immediately after boot, then all reconnected to `Active` within ~15s once the manager was fully up — consistent with the disk-full-incident recovery behaviour documented above. The dashboard briefly returned HTTP 503 (checked via `curl -sk`) and cleared to 302 within 10 seconds, the same flood-stage-block-clears-itself pattern as the earlier incident.

For Windows Event Log ingestion specifically: `grep -c '(agent-windows-1)' alerts.log` initially showed only 1 (the startup heartbeat). Ran a read-only PowerShell diagnostic via SSM Run Command on `agent-windows-1` (`Get-Service WazuhSvc`, checked `ossec.conf` eventchannel config, tailed `ossec.log`, counted recent Security-log events) — confirmed the agent service was running and eventchannel monitoring was correctly configured for Application/Security/System, and that the Windows Security log itself had 97 events in the prior 10 minutes. Re-checked the manager a couple of minutes later and found genuine `windows,windows_application` tagged alerts (rule 60642, sourced `any->EventChannel`) — real Windows Application-log events, not just the connection heartbeat.

**Root cause:** Not a failure — the delay was simply that no Windows-side event had occurred yet to trigger an alert-worthy Wazuh rule in the first ~2 minutes after the agent reconnected; the pipeline itself was already correctly configured.

**Fix:** None needed. Evidence saved: `week4/windows-eventlog-ingestion-proof.txt` (real alert JSON) and `week4/agent-control-list-final.txt` (all 4 agents Active).

**Prevention:** When verifying event ingestion for infrequently-active sources like a Windows Application log, allow a couple of minutes after agent reconnection before concluding ingestion isn't working — absence of alerts in the first few seconds is not evidence of a broken pipeline, since Wazuh only writes to `alerts.log` on a rule match (not full raw ingestion), and matchable events on Windows arrive on their own schedule (service checks, scheduled tasks, etc.), not continuously like Linux auth logs.

**Also confirmed this session:** disk usage on the manager is healthy (37% used, 37GB free on a 58GB root volume — larger than the 28GB noted in the original disk-full incident, so either the volume was resized at some point or that earlier figure was slightly off; not worth chasing further since current headroom is ample), and the security group (`sg-0852845171781156b`) still has exactly the 5 expected rules with no drift since the 2026-09-22/23 widening.
