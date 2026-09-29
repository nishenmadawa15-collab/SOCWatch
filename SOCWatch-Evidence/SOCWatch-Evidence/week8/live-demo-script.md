# Week 8 — Live Demonstration Script

Prepared 2026-09-24 from the project's real, already-proven evidence. This is a script to rehearse and adapt, not a transcript to read verbatim — practice it out loud before the actual demo.

## Pre-demo checklist (run the morning of, not the night before)

1. Start all 4 instances (they're stopped between sessions to control cost):
   ```
   aws ec2 start-instances --instance-ids i-0e59209880db2b06a i-09950d607c6484e2b i-0b543a19841f7e3bd i-0d09166ac099047f5 --profile socwatch
   ```
   (Or via EC2 Console → select all 4 → Instance state → Start.) Allow 2-3 minutes for full boot.
2. Confirm health:
   ```
   ssh -i ~/.ssh/socwatch ubuntu@13.126.121.206 "sudo systemctl is-active wazuh-manager wazuh-indexer wazuh-dashboard && sudo /var/ossec/bin/agent_control -l"
   ```
   Expect: `active` x3, all 4 agent IDs (000/001/002/003) `Active`.
3. Log into the dashboard yourself beforehand (`https://13.126.121.206`) and accept the certificate warning **before** the mentor is watching — don't let a "Privacy error" screen be the first thing they see.
4. Have this evidence folder and `SOCWatch-Installation-and-Project-Guide.docx` open in another tab/window as backup if anything on the live lab misbehaves mid-demo.

## Demo flow (~15-20 minutes)

### 1. Orientation (2 min)
Show the dashboard's Agents page: all 3 agents (agent-linux-1, agent-linux-2, agent-windows-1) Active. State the architecture in one sentence: one manager, three monitored endpoints, one VPC, admin access currently open (0.0.0.0/0 on SSH/RDP/HTTPS — explain this was a deliberate tradeoff after your mobile ISP's CGNAT made any IP restriction unworkable; mention the 5-entry troubleshooting log as evidence of the reasoning).

### 2. Use case 1 — Log ingestion (2-3 min)
Dashboard → Security Events, filter by `agent.name`. If quiet, SSH into agent-linux-1 and trigger a `sudo` command live to generate a fresh event on screen. Expand one event, point out: raw log, matched rule, agent name. Mention Windows Event Log ingestion was separately verified (rule 60642, Application channel).

### 3. Use case 2 — FIM (3-4 min, the strongest evidence)
This can be done live for maximum impact:
```
ssh -i ~/.ssh/socwatch ubuntu@13.126.121.206
ssh -i ~/.ssh/socwatch ubuntu@10.0.0.164   # via the manager as bastion, or direct if reachable
echo "test" > ~/fim-test/demo.txt      # triggers rule 554
echo "modified" >> ~/fim-test/demo.txt  # triggers rule 550 — show the diff
rm ~/fim-test/demo.txt                  # triggers rule 553
```
Refresh the dashboard's Security Events, filtered to rule.id in (554, 550, 553). Open the 550 alert and show the `report_changes` diff — this is the one moment to slow down on, since it's the most visually convincing evidence in the whole project.

### 4. Use case 3 — Vulnerability detection (2 min)
Dashboard → Vulnerability Detection for an agent. Show the finding count (3,910 as of 2026-09-24 — mention it will have changed by demo day, that's expected and fine, don't be thrown by a different number). Expand one finding: CVSS score, affected vs. fixed version. Explain in one sentence why this matters: turns "what's installed" into "what's exploitable."

### 5. Use case 4 — Brute-force correlation (2-3 min)
Either replay the captured evidence (week6/rule-ids.md) or, if time allows, run it live:
```
sudo apt-get install -y sshpass   # if not already installed on agent-linux-2
for i in $(seq 1 12); do
  sshpass -p 'WrongPassword123' ssh -o StrictHostKeyChecking=no \
    -o PreferredAuthentications=password -o PubkeyAuthentication=no \
    baduser@10.0.0.164 2>/dev/null
done
```
Filter dashboard by rule.id 5710 and 5712. Point out the escalation: 12 individual level-5 events collapse into a single level-10 correlation alert with the source IP attributed. This is the "so what" of the whole project — noise vs. signal.

### 6. Process & troubleshooting (2 min)
Briefly show `troubleshooting-log.md` — mention the disk-full incident and the diagnosis/fix, to demonstrate the operational process the grading criteria weight at 15%, not just a lab that happened to work.

### 7. Close (1-2 min)
Return to the Conclusions slide of the presentation (or state verbally): all 4 use cases proven, real incidents handled, production-improvement plan identifies 6 concrete next steps. Invite questions.

## Anticipated questions (prepare short answers)

- **"Why is the security group open to 0.0.0.0/0?"** — CGNAT on the mobile ISP rotated the IP across a pool wider than a /21; SSH keys and dashboard/Windows login are the real access control, not the network ACL. Documented tradeoff, not an oversight.
- **"Why wasn't Terraform used for the actual deployment?"** — Local AWS CLI credentials never got configured; infrastructure was provisioned manually via console to keep the project moving rather than stay blocked. Terraform is kept as reference IaC.
- **"What would you do differently in production?"** — Point to the 6-item production improvement plan (CA-issued TLS, VPN/bastion instead of an IP allowlist, HA topology, external log retention, tuned active response, MITRE ATT&CK mapping).
- **"What was the hardest problem you hit?"** — The manager disk-full incident (vulnerability-feed updater retrying into a full disk) is a good, concrete answer with a clear root cause and fix.

## Session-end ritual (do this after the demo, not before)

```
aws ec2 stop-instances --instance-ids i-0e59209880db2b06a i-09950d607c6484e2b i-0b543a19841f7e3bd i-0d09166ac099047f5 --profile socwatch
```
The manager's Elastic IP is retained on stop, so the dashboard URL stays the same next time.
