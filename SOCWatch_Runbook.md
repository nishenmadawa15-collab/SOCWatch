# SOCWatch — 8-Week Working Runbook

**Wazuh SOC Monitoring Lab · CCA Cyber Security Internship**
Mode: Individual · Duration: 8 weeks · Output: SOC report + live demo

Verified against official Wazuh documentation, August 2026. Current Wazuh release: **4.14.7** (29 July 2026).

---

## How to use this document

This is your working reference for all eight weeks. Each week has:

- **Do** — the tasks, with exact commands
- **Capture** — the evidence you must produce that week (this is what gets graded)
- **Checkpoint** — what the mentor must approve before you move on

Two rules that decide your grade more than anything technical:

1. **Capture evidence at the moment it works, not later.** If the lab breaks in Week 6 and you never screenshotted Week 4, you have nothing. Screenshot immediately.
2. **Log every problem you hit, even trivial ones.** The brief requires at least two resolved troubleshooting entries, and the assessment gives 15% to working process. A troubleshooting log written from memory in Week 7 reads exactly like a troubleshooting log written from memory in Week 7.

---

## Part 1 — Read this before you touch AWS

### 1.1 The cost reality

The brief specifies instance sizes that are **not all free-tier eligible**. Plan for this now.

| Instance | Type | ~On-demand rate | If left running 24/7 for 8 weeks |
|---|---|---|---|
| wazuh-manager | t3.medium | ~$0.042/hr | ~$56 |
| agent-linux-1 | t3.micro | ~$0.010/hr | ~$14 (free tier may cover 750 hr/mo) |
| agent-linux-2 | t3.micro | ~$0.010/hr | ~$14 (shares the same 750 hr) |
| agent-windows-1 | t3.small + Windows licence | ~$0.047/hr | ~$63 |
| EBS storage | ~98 GB gp3 total | ~$0.08/GB-month | ~$16 |

**Running everything 24/7 for eight weeks costs roughly $160.** Running it ~6 hours per working session, ~3 sessions a week, costs roughly **$15–25 total**.

The single most important cost habit:

```bash
# Stop all four instances at the end of every session
aws ec2 stop-instances --instance-ids i-aaa i-bbb i-ccc i-ddd
```

Stopped instances cost nothing for compute. You still pay for EBS (~$16 over 8 weeks) — that is unavoidable and fine.

**Set a billing alarm in Week 1.** AWS Billing → Budgets → create a $20 monthly budget with an email alert at 80%. Screenshot it — it belongs in your report as evidence of cost control, which reads as professional judgement.

### 1.2 The public IP problem

Your security group allows SSH, HTTPS and RDP **only from your own public IP /32**. If you are on home broadband, a mobile hotspot, or campus wifi, that IP changes — sometimes daily. When it changes, you lose access to everything and it looks like the lab broke.

Check your current IP before every session:

```bash
curl -s https://checkip.amazonaws.com
```

If it differs from your security group rule, update the rule first. Do not spend an hour debugging SSH. **This will happen to you at least once — and it is a perfect first troubleshooting log entry.**

### 1.3 The t3.medium memory warning

Wazuh all-in-one runs manager + indexer + dashboard on one host. t3.medium gives you 2 vCPU and **4 GiB RAM**. That is the documented bare minimum and the OpenSearch indexer is memory-hungry. Symptoms of running out: the dashboard returns 502, or `wazuh-indexer` dies silently after install.

Add swap on the manager immediately after launch, before installing Wazuh:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h    # confirm 4Gi swap is present
```

This takes two minutes and prevents the most common way this project stalls in Week 3.

---

## Part 2 — Target architecture

```
                    ┌─────────────────────────────────┐
                    │        wazuh-manager            │
                    │  Ubuntu 22.04 · t3.medium       │
                    │  Wazuh server + indexer +       │
                    │  dashboard (all-in-one)         │
                    │  Private: 10.0.1.10             │
                    └────────────┬────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │ 1514/1515 TCP    │                  │
              │                  │                  │
    ┌─────────┴──────┐  ┌────────┴───────┐  ┌───────┴─────────┐
    │ agent-linux-1  │  │ agent-linux-2  │  │ agent-windows-1 │
    │ Ubuntu 22.04   │  │ Rocky Linux 9  │  │ Win Server 2022 │
    │ t3.micro       │  │ t3.micro       │  │ t3.small        │
    │ 10.0.1.21      │  │ 10.0.1.22      │  │ 10.0.1.23       │
    └────────────────┘  └────────────────┘  └─────────────────┘

    All four in VPC 10.0.0.0/16, subnet 10.0.1.0/24, same AZ.
    Agents reach the manager on the PRIVATE IP only.
    Admin access (22/443/3389) from your public IP /32 only.
```

### 2.1 Security group — the exact rules

One security group, `sg-socwatch-lab`, applied to all four instances.

**Inbound:**

| Type | Protocol | Port | Source | Purpose |
|---|---|---|---|---|
| SSH | TCP | 22 | `YOUR.IP.HERE/32` | Linux admin |
| HTTPS | TCP | 443 | `YOUR.IP.HERE/32` | Wazuh dashboard |
| RDP | TCP | 3389 | `YOUR.IP.HERE/32` | Windows setup |
| Custom TCP | TCP | 1514 | `10.0.0.0/16` | Agent security events |
| Custom TCP | TCP | 1515 | `10.0.0.0/16` | Agent enrolment |

**Outbound:** all traffic (needed for package downloads and CVE feed updates).

**Never** use `0.0.0.0/0` on 22, 443 or 3389. The brief says any admin port open to the internet is rejected at review.

Create it from the CLI so you have a reproducible record:

```bash
MY_IP=$(curl -s https://checkip.amazonaws.com)
VPC_ID=vpc-xxxxxxxx    # your VPC

SG_ID=$(aws ec2 create-security-group \
  --group-name sg-socwatch-lab \
  --description "SOCWatch Wazuh SOC lab" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 22   --cidr ${MY_IP}/32
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 443  --cidr ${MY_IP}/32
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 3389 --cidr ${MY_IP}/32
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 1514 --cidr 10.0.0.0/16
aws ec2 authorize-security-group-ingress --group-id $SG_ID \
  --protocol tcp --port 1515 --cidr 10.0.0.0/16

echo "Security group: $SG_ID"
```

Then screenshot the rules in the console — that is your Week 2 evidence.

---

## Part 3 — Week by week

---

### Week 1 — Understand, plan and set up

**Do**

1. Read the brief end to end. Write down every question and bring it to the first sync.
2. Create your AWS account (or confirm access) and set up an IAM user with programmatic access — do not use the root account.
3. Set the $20 billing budget with an 80% email alert.
4. Create the evidence folder structure (see Part 4 below).
5. Draw the architecture diagram. It does not need to be beautiful; it needs to show four boxes, the VPC boundary, the ports and the direction of traffic.
6. Fill in the instance inventory table with the planned values (you will fill in real IPs in Week 2).
7. Create the risk list and the weekly update template.
8. Generate your SSH key pair — key-based access only, no passwords:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/socwatch -C "socwatch-lab"
   ```
   Import the public key into EC2 as a key pair named `socwatch`.

**Capture**

- `week1/architecture-draft.png`
- `week1/instance-inventory.md` (planned)
- `week1/risk-list.md`
- `week1/billing-budget.png`
- `week1/evidence-folder-structure.png`

**Checkpoint** — Mentor approves scope, evidence structure and AWS plan.

**In the sync, be ready to:** explain the lab in one minute, show the architecture draft, state what you own.

---

### Week 2 — Create the AWS foundation

**Do**

1. Confirm your VPC and subnet. Default VPC is acceptable if all four instances land in the **same subnet** — but a purpose-built VPC (`10.0.0.0/16`, subnet `10.0.1.0/24`) is cleaner to explain and looks better in the report.
2. Create `sg-socwatch-lab` with the exact rules from Part 2.1.
3. Launch the four instances:

   | Name | AMI | Type | Storage |
   |---|---|---|---|
   | wazuh-manager | Ubuntu Server 22.04 LTS | t3.medium | 30 GB gp3 |
   | agent-linux-1 | Ubuntu Server 22.04 LTS | t3.micro | 8 GB gp3 |
   | agent-linux-2 | Rocky Linux 9 | t3.micro | 8 GB gp3 |
   | agent-windows-1 | Windows Server 2022 Base | t3.small | 30 GB gp3 |

   Tag every instance with `Name` and `Project=SOCWatch`.

4. **Record the manager's private IP immediately.** Everything downstream depends on it. Write it in your inventory and screenshot the instance detail page.
5. Add swap to the manager (Part 1.3).
6. Harden SSH on both Linux agents and the manager:
   ```bash
   sudo sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
   sudo sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
   sudo systemctl restart sshd
   ```
   Keep your existing session open while you test a second connection — if you lock yourself out you will be rebuilding the instance.
7. Update everything:
   ```bash
   sudo apt update && sudo apt upgrade -y          # Ubuntu
   sudo dnf update -y                              # Rocky
   ```
8. Test connectivity from the manager to each agent's private IP:
   ```bash
   ping -c 3 10.0.1.21
   ```
9. Start the troubleshooting log. Your first entry is almost certainly going to be an IP/SSH issue.

**Capture**

- `week2/security-group-rules.png` — inbound rules table, all five rules visible
- `week2/instance-list.png` — all four instances running, with types
- `week2/instance-inventory.md` — completed with real private/public IPs
- `week2/ssh-connection-proof.png` — terminal showing successful key-based login
- `week2/hardening-notes.md`
- `troubleshooting-log.md` — entry 1

**Checkpoint** — All machines exist, access is controlled, no admin port open to the internet.

**In the sync:** show the SG rules, show the instance list, explain *why* each port is limited to that source. That "why" is the part that gets marked.

---

### Week 3 — Deploy the Wazuh manager

**Do**

1. SSH to the manager:
   ```bash
   ssh -i ~/.ssh/socwatch ubuntu@<MANAGER_PUBLIC_IP>
   ```
2. Confirm swap is active (`free -h`). Do not skip this.
3. Run the all-in-one installation assistant:
   ```bash
   curl -sO https://packages.wazuh.com/4.14/wazuh-install.sh
   sudo bash ./wazuh-install.sh -a
   ```
   This installs the Wazuh server, indexer and dashboard on the single host. It takes 10–20 minutes on a t3.medium. **Do not interrupt it.**

4. The assistant prints the admin password at the end. If you miss it:
   ```bash
   sudo tar -O -xvf wazuh-install-files.tar wazuh-install-files/wazuh-passwords.txt
   ```
   Store this in a password manager or a local file **outside** the evidence folder. Never in a screenshot, never in GitHub, never in LMS comments.

5. Verify all three services:
   ```bash
   sudo systemctl status wazuh-manager
   sudo systemctl status wazuh-indexer
   sudo systemctl status wazuh-dashboard
   ```
   All three must be `active (running)`. Screenshot this.

6. Record the version:
   ```bash
   /var/ossec/bin/wazuh-control info
   ```

7. Open the dashboard in your browser: `https://<MANAGER_PUBLIC_IP>`
   You will get a certificate warning — the assistant generates self-signed certificates. Accept it and log in as `admin`.

**Capture**

- `week3/dashboard-login.png` — the login screen (no password typed/visible)
- `week3/dashboard-overview.png` — the landing page after login
- `week3/services-running.png` — all three systemctl outputs
- `week3/wazuh-version.png`
- `week3/setup-notes.md` — what you ran, in order, and anything that differed from the docs

**Checkpoint** — Dashboard accessible over HTTPS, admin login works, all central services running.

**Common failures**

| Symptom | Cause | Fix |
|---|---|---|
| Browser times out on 443 | Your public IP changed | Update the SG rule |
| 502 Bad Gateway | Indexer OOM-killed | Add swap, `sudo systemctl restart wazuh-indexer` |
| Assistant fails mid-run | Partial install left behind | `sudo bash ./wazuh-install.sh -u` then re-run with `-a` |
| `curl` gets 404 | Version path changed | Check documentation.wazuh.com/current/quickstart.html for the current path |

---

### Week 4 — Enrol Linux and Windows agents

The one thing that matters: **`WAZUH_MANAGER` must be the manager's PRIVATE IP.** Using the public IP is the single most common failure in this project — the agent may appear to install fine and then never connect, or connect and then drop.

**Do**

**agent-linux-1 (Ubuntu 22.04):**

```bash
sudo apt-get install -y gnupg apt-transport-https

curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | \
  sudo gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import
sudo chmod 644 /usr/share/keyrings/wazuh.gpg

echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | \
  sudo tee /etc/apt/sources.list.d/wazuh.list

sudo apt-get update
sudo WAZUH_MANAGER="10.0.1.10" WAZUH_AGENT_NAME="agent-linux-1" apt-get install -y wazuh-agent

sudo systemctl daemon-reload
sudo systemctl enable wazuh-agent
sudo systemctl start wazuh-agent
sudo systemctl status wazuh-agent
```

**agent-linux-2 (Rocky Linux 9):**

```bash
sudo tee /etc/yum.repos.d/wazuh.repo > /dev/null << 'EOF'
[wazuh]
gpgcheck=1
gpgkey=https://packages.wazuh.com/key/GPG-KEY-WAZUH
enabled=1
name=EL-$releasever - Wazuh
baseurl=https://packages.wazuh.com/4.x/yum/
priority=1
EOF

sudo WAZUH_MANAGER="10.0.1.10" WAZUH_AGENT_NAME="agent-linux-2" dnf install -y wazuh-agent

sudo systemctl daemon-reload
sudo systemctl enable wazuh-agent
sudo systemctl start wazuh-agent
sudo systemctl status wazuh-agent
```

**agent-windows-1 (Windows Server 2022):**

RDP in using the decrypted Administrator password, open PowerShell as Administrator:

```powershell
Invoke-WebRequest -Uri "https://packages.wazuh.com/4.x/windows/wazuh-agent-4.14.7-1.msi" `
  -OutFile "$env:TEMP\wazuh-agent.msi"

msiexec.exe /i "$env:TEMP\wazuh-agent.msi" /q `
  WAZUH_MANAGER="10.0.1.10" `
  WAZUH_AGENT_NAME="agent-windows-1"

Start-Service WazuhSvc
Get-Service WazuhSvc
```

**Verify from the manager:**

```bash
sudo /var/ossec/bin/agent_control -l
```

All three should show `Active`. Then confirm in the dashboard under **Agents** — the brief specifically requires the dashboard screenshot showing three Active agents.

**Capture**

- `week4/three-agents-active.png` — dashboard Agents page, all three Active ← **required by the brief**
- `week4/agent-control-list.png` — CLI output
- `week4/agent-service-ubuntu.png`, `week4/agent-service-rocky.png`, `week4/agent-service-windows.png`
- `week4/private-ip-mapping.md` — which agent has which private IP
- `troubleshooting-log.md` — entry 2

**Checkpoint** — All three agents visible in Wazuh with Active status.

**If an agent shows Never connected or Disconnected:**

```bash
# On the agent — what is it actually trying to reach?
sudo grep -A2 '<server>' /var/ossec/etc/ossec.conf

# Can it reach the manager at all?
nc -zv 10.0.1.10 1514
nc -zv 10.0.1.10 1515

# What does the agent log say?
sudo tail -50 /var/ossec/logs/ossec.log
```

If `<address>` shows the public IP, fix it in `/var/ossec/etc/ossec.conf` and restart the agent. If `nc` fails, your security group is missing the 1514/1515 rule from the VPC CIDR.

---

### Week 5 — Prove log ingestion and file integrity monitoring

**Do**

**Log ingestion (use case 1):**

1. Dashboard → **Threat Hunting** / **Security Events**.
2. Filter by `agent.name: agent-linux-1`. Set the time range to Last 24 hours.
3. Generate traffic if the view is quiet — `sudo su`, then exit, then a failed `sudo` — anything that writes to auth logs.
4. Repeat filtering by `agent-windows-1` to show Windows event data arriving.
5. Expand one event and screenshot the full document — the raw log field, the rule that matched, the agent name. A screenshot of a bar chart proves nothing; a screenshot of a parsed event proves ingestion.

**File integrity monitoring (use case 2):**

On `agent-linux-1`, edit `/var/ossec/etc/ossec.conf` and add inside the `<syscheck>` block:

```xml
<directories check_all="yes" report_changes="yes" realtime="yes">/home/ubuntu/fim-test</directories>
```

Then:

```bash
sudo mkdir -p /home/ubuntu/fim-test
sudo systemctl restart wazuh-agent
```

Wait 30 seconds for the agent to re-sync, then run the test:

```bash
# Create
echo "baseline content" | sudo tee /home/ubuntu/fim-test/testfile.txt
sleep 10

# Modify
echo "attacker added this line" | sudo tee -a /home/ubuntu/fim-test/testfile.txt
sleep 10

# Delete
sudo rm /home/ubuntu/fim-test/testfile.txt
```

In the dashboard, go to the agent → **File Integrity Monitoring**, or filter Security Events by `rule.id: (550 OR 553 OR 554)`.

- **554** — file added
- **550** — file modified
- **553** — file deleted

Screenshot the modification alert expanded, showing the `report_changes` diff (Wazuh shows the actual added line) and the before/after SHA256 hashes.

**Write the explanation.** This is 20% of your grade — the alert analysis. Two short paragraphs:

> Wazuh's FIM module stores a baseline hash (MD5, SHA1, SHA256) and metadata for every file in a monitored directory. In realtime mode it uses the Linux inotify subsystem to receive kernel notifications the moment a file changes, rather than waiting for the periodic scan.
>
> When `testfile.txt` was modified, the new SHA256 no longer matched the stored baseline, so the agent forwarded a syscheck event to the manager. Rule 550 matched, producing a level-7 alert. Because `report_changes="yes"` was set, the alert includes a diff showing the exact line added. In a real SOC this is how you detect an attacker modifying `/etc/passwd`, planting a webshell, or tampering with a binary — the content change is visible even if the attacker preserved the timestamp.

**Capture**

- `week5/log-ingestion-linux.png` — expanded event document
- `week5/log-ingestion-windows.png`
- `week5/fim-alert-created.png` (rule 554)
- `week5/fim-alert-modified.png` (rule 550, showing the diff) ← **the strongest single screenshot in the project**
- `week5/fim-alert-deleted.png` (rule 553)
- `week5/fim-config.md` — the syscheck block you added
- `week5/fim-explanation.md`

**Checkpoint** — At least one raw log event and one FIM event captured and explained.

---

### Week 6 — Prove vulnerability and authentication-failure detection

**Do**

**Vulnerability detection (use case 3):**

1. Confirm it is enabled on the manager — it is on by default in 4.14:
   ```bash
   sudo grep -A4 '<vulnerability-detection>' /var/ossec/etc/ossec.conf
   ```
   You should see:
   ```xml
   <vulnerability-detection>
      <enabled>yes</enabled>
      <index-status>yes</index-status>
      <feed-update-interval>60m</feed-update-interval>
   </vulnerability-detection>
   ```

2. The CVE feed download takes time on first run. Give it at least an hour after the manager comes up before expecting results. Watch it:
   ```bash
   sudo tail -f /var/ossec/logs/ossec.log | grep -i vulnerability
   ```

3. Force a package inventory scan so the manager has something to correlate against:
   ```bash
   # On an agent
   sudo systemctl restart wazuh-agent
   ```

4. If your agents are fully patched and show nothing, install a known-old package to generate a finding:
   ```bash
   # On agent-linux-1 — a deliberately outdated package
   wget https://ftp.debian.org/debian/pool/main/o/openssl/... # or:
   sudo apt-get install -y --allow-downgrades <package>=<old-version>
   ```
   A simpler and safer route: install an old version of a userland tool you do not depend on. Document exactly what you installed and why — a mentor will respect a deliberate, explained test more than an accidental finding.

5. Dashboard → agent → **Vulnerability Detection**. Screenshot the CVE list showing severity, package name and CVE ID. Expand one CVE and screenshot the detail — CVSS score, affected version, fixed version.

**Authentication failures (use case 4):**

From your own machine (or from `agent-linux-2` targeting `agent-linux-1` over the private network), generate failed SSH logins:

```bash
for i in $(seq 1 10); do
  ssh -o StrictHostKeyChecking=no -o PasswordAuthentication=yes \
      -o PubkeyAuthentication=no baduser@10.0.1.21
done
# Enter a wrong password each time, or use sshpass with a wrong password
```

A cleaner scripted version:

```bash
sudo apt-get install -y sshpass
for i in $(seq 1 12); do
  sshpass -p 'WrongPassword123' ssh -o StrictHostKeyChecking=no \
    -o PreferredAuthentications=password -o PubkeyAuthentication=no \
    baduser@10.0.1.21 2>/dev/null
  echo "attempt $i"
done
```

Note: you disabled password auth in Week 2, so these will fail at the auth stage — which is exactly the log line you want.

In the dashboard, filter Security Events by `rule.id: (5710 OR 5716 OR 5712 OR 5551)`.

- **5710** — attempt to log in with a non-existent user
- **5716** — SSH authentication failed
- **5712** — SSHD brute force trying to get access (correlation rule, fires after multiple 5710/5716 in a window)
- **5551** — related brute-force correlation

Screenshot the **5712** alert specifically — it demonstrates Wazuh's correlation engine, not just single-event matching. Record the source IP and the rule level.

**Write the explanation:**

> Individual failed logins are noise; a SOC cannot alert on every one. Wazuh handles this with `frequency` and `timeframe` attributes on rules. Rule 5716 fires on each failed SSH authentication at level 5. Rule 5712 is a composite rule that fires only when several 5716/5710 events arrive from the same source IP inside the configured window — it escalates to level 10, which is what an analyst should actually be paged on.
>
> The distinction matters operationally: 5716 tells you someone typed a wrong password, 5712 tells you someone is running a password-guessing tool. The source IP field is what you would feed into a blocklist or an active-response rule.

**Capture**

- `week6/vulnerability-cve-list.png`
- `week6/vulnerability-cve-detail.png` — one CVE expanded with CVSS score
- `week6/auth-failure-single.png` (5710 / 5716)
- `week6/auth-failure-bruteforce.png` (5712) ← **the one that shows you understand correlation**
- `week6/rule-ids.md` — which rules fired, at what level, from what source IP
- `week6/detection-explanations.md`

**Checkpoint** — Vulnerability and authentication-failure evidence visible and in the report.

**Stretch goal only after all four use cases are proven:** active response. Do not start this if anything above is incomplete — the brief is explicit that advanced features come only after required alerts work.

---

### Week 7 — Finalise, test and document

**Do**

1. Run the completeness audit. Open your evidence folder and tick off every required screenshot from Part 4.2. Anything missing, go and capture it now — the lab is still running this week.
2. Finalise the architecture diagram with real IPs.
3. Complete the IP schema table.
4. Write the report. Structure below in Part 5.
5. Complete at least two troubleshooting entries in the required format.
6. Write the production improvement section (Part 5.7) — this is where you demonstrate you understand the gap between a lab and a real SOC.
7. Re-audit the security group. Confirm your IP is still current, confirm no rule has drifted to `0.0.0.0/0`, screenshot it again as final-state evidence.
8. Build the presentation deck.
9. **Do a dry run of the demo.** Time yourself. Find out now that the dashboard takes 40 seconds to load, not during the assessment.

**Capture**

- `week7/final-report-draft.pdf`
- `week7/architecture-final.png`
- `week7/ip-schema.md`
- `week7/security-group-final.png`
- `troubleshooting-log.md` — complete
- `week7/improvement-plan.md`
- `week7/presentation-draft.pptx`

**Checkpoint** — Mentor confirms readiness for final demonstration.

---

### Week 8 — Present, demonstrate and hand over

**Demo running order** (rehearse this; it should take 8–10 minutes):

1. **The problem** — 30 seconds. Logs scattered across machines, no central visibility, evidence hard to produce.
2. **The architecture** — 1 minute. Four instances, one VPC, agents talk to the manager on the private IP, admin access locked to one source IP.
3. **The dashboard, live** — 1 minute. Log in, show the overview, show three agents Active.
4. **Use case 1, log ingestion** — 1 minute. Filter by agent, expand one event, show the parsed fields.
5. **Use case 2, FIM live** — 2 minutes. Modify the test file on camera, refresh, show rule 550 with the diff. This is the moment that lands.
6. **Use case 3, vulnerability** — 1 minute. Show the CVE list and one detail view.
7. **Use case 4, auth failure** — 1 minute. Show 5712, explain correlation vs single events.
8. **Troubleshooting** — 1 minute. Pick your best entry, describe symptom → diagnosis → fix.
9. **Improvements** — 1 minute. What you would change to run this in production.

**Have a fallback.** If the live FIM demo fails on the day — network, expired IP rule, service down — you need the screenshots ready in a second window. Never let a demo failure cost you marks you already earned.

**Then:**

- Submit through LMS: final report PDF, presentation, evidence links, dashboard URL, individual summary.
- **Do not submit** SSH private keys, the `wazuh-passwords.txt` contents, or any real password.
- After acceptance is confirmed, terminate the instances and delete the security group. Screenshot the empty instance list — clean-up is part of professional practice and worth mentioning.

---

## Part 4 — Evidence system

### 4.1 Folder structure

Create this in Week 1 and populate as you go:

```
SOCWatch-Evidence/
├── README.md                    # index: what is where, one line each
├── troubleshooting-log.md
├── instance-inventory.md
├── week1/
├── week2/
├── week3/
├── week4/
├── week5/
├── week6/
├── week7/
├── week8/
├── diagrams/
│   ├── architecture-final.png
│   └── architecture-final.drawio
└── report/
    ├── SOCWatch-Final-Report.docx
    └── SOCWatch-Presentation.pptx
```

**Screenshot naming:** `weekN/NN-short-description.png` — e.g. `week5/03-fim-alert-modified-rule550.png`. Numbered so they sort in the order you took them.

**Every screenshot needs a caption** in the report: what it shows, what to look at, why it matters. The brief says a reviewer should understand without asking you to explain.

**Redact before saving, not before submitting.** Blur passwords, tokens, full account IDs and private key material at the moment you take the screenshot. Public IPs are fine to show.

### 4.2 Required evidence checklist

Screenshots (from the brief, mandatory):

- [ ] Dashboard login screen
- [ ] Dashboard overview after login
- [ ] Three agents with Active status
- [ ] Log ingestion alert
- [ ] FIM alert
- [ ] Vulnerability result
- [ ] Authentication failure alert

Notes (from the brief, mandatory):

- [ ] Instance inventory
- [ ] Security group rules
- [ ] IP schema
- [ ] Troubleshooting log (minimum two resolved issues)
- [ ] Short technical explanations for each alert
- [ ] Improvement plan
- [ ] Individual contribution summary

Worth adding beyond the minimum:

- [ ] Billing budget / cost control
- [ ] SSH hardening proof
- [ ] Wazuh version and service status
- [ ] Final-state security group re-audit
- [ ] Clean-up confirmation

### 4.3 Instance inventory template

| Name | Role | OS | Type | Private IP | Public IP | Purpose |
|---|---|---|---|---|---|---|
| wazuh-manager | Server + indexer + dashboard | Ubuntu 22.04 | t3.medium / 30 GB | 10.0.1.10 | (elastic or dynamic) | Central SOC node, receives all agent events, hosts dashboard |
| agent-linux-1 | Endpoint 1 | Ubuntu 22.04 | t3.micro / 8 GB | 10.0.1.21 | — | Primary FIM and log ingestion test target |
| agent-linux-2 | Endpoint 2 | Rocky Linux 9 | t3.micro / 8 GB | 10.0.1.22 | — | Second Linux family, log ingestion, brute-force source |
| agent-windows-1 | Endpoint 3 | Windows Server 2022 | t3.small / 30 GB | 10.0.1.23 | (for RDP) | Windows event log collection |

### 4.4 Troubleshooting log format

Use this exact structure. Two entries minimum; four or five reads much better.

```markdown
### TS-01 — Wazuh dashboard unreachable on port 443

**Date:** 2026-09-02
**Week:** 3
**Severity:** Blocking

**Symptom**
Browser timed out on https://<manager-public-ip>. No error page, just a hang.
SSH to the same instance also failed.

**Investigation**
1. Confirmed the instance was running in the EC2 console — it was.
2. Since both SSH and HTTPS failed, suspected a network rule rather than a service fault.
3. Ran `curl -s https://checkip.amazonaws.com` and compared to the security group
   inbound rule. My ISP had reassigned my public IP overnight.

**Root cause**
Security group rules for 22, 443 and 3389 were pinned to the previous public IP /32.

**Fix**
Updated all three inbound rules to the current IP. Access restored immediately.

**Prevention**
Added `curl -s https://checkip.amazonaws.com` as the first command of every session,
before assuming anything is broken.
```

### 4.5 Weekly update template

```markdown
## SOCWatch — Week N Update

**1. Work completed**
- …

**2. Demonstrable evidence**
- <screenshot / dashboard view I will show live>

**3. Tasks in progress**
- …

**4. Blockers or risks**
- …

**5. Decisions required**
- …

**6. Individual contributions**
- …

**7. Plan for next week**
- …
```

### 4.6 Risk list

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Public IP changes, lab appears broken | High | Low | Check IP at session start; update SG rule |
| 2 | t3.medium runs out of memory, indexer dies | Medium | High | 4 GB swap added before install; monitor `free -h` |
| 3 | AWS costs exceed budget | Medium | Medium | Stop instances after every session; $20 budget alarm at 80% |
| 4 | Agent connects to public instead of private IP | Medium | High | Set `WAZUH_MANAGER` to private IP at install; verify with `agent_control -l` |
| 5 | CVE feed not populated in time for Week 6 | Medium | Medium | Start the manager early in the week; allow 1+ hr for feed download |
| 6 | Lab breaks before evidence is captured | Medium | Critical | Capture every screenshot the moment it works, never retrospectively |
| 7 | Locked out of SSH after hardening | Low | High | Keep an active session open while testing the new config |
| 8 | Live demo fails on the day | Medium | High | Screenshot fallback ready in a second window |
| 9 | Windows agent fails to enrol via MSI | Low | Medium | Verify `WazuhSvc` running; check `ossec.log` in `C:\Program Files (x86)\ossec-agent` |
| 10 | Credentials accidentally committed or screenshotted | Low | Critical | Redact at capture time; keep passwords outside the evidence folder |

---

## Part 5 — Final report structure

Target 20–30 pages including screenshots. Write the technical explanations in plain language — the brief asks for this repeatedly and the assessment rewards it.

**1. Executive summary** (½ page)
What was built, what it proves, in language a non-specialist manager understands.

**2. Problem statement** (½ page)
Scattered logs, no central visibility, hard to produce evidence. Frame it operationally, not academically.

**3. Architecture** (2–3 pages)
Diagram, instance inventory table, IP schema, data flow narrative: endpoint event → agent → 1514 → manager → decoder → rule → indexer → dashboard.

**4. Security design** (2–3 pages)
Security group table with a justification column. SSH hardening. Why the manager private IP is used for agent traffic and what would be exposed if the public IP were used instead. Credential handling.

**5. Implementation** (4–6 pages)
Week 2 through Week 4 as a build narrative: what you ran, what happened, what the evidence shows. Screenshots inline with captions.

**6. Detection use cases** (6–8 pages)
One section each for log ingestion, FIM, vulnerability detection, authentication failure. Each section: what you configured, how you triggered it, the screenshot, the rule that fired, **what it means for a SOC analyst**. That last part is where the 20% alert-analysis marks live.

**7. Troubleshooting** (2–3 pages)
Your log, cleaned up. Minimum two entries.

**8. Production improvement plan** (1–2 pages)
Concrete and specific. Suggestions worth writing:
- Replace self-signed certificates with a proper CA-issued certificate
- Put the dashboard behind a VPN or bastion instead of an IP allowlist
- Split manager and indexer onto separate hosts; add a second manager node for HA
- Ship alerts to an external SIEM or S3 for long-term retention beyond the indexer's window
- Configure active response with careful thresholds, and explain the risk of auto-blocking a legitimate admin
- Add agent groups and centralised configuration so `ossec.conf` is not edited per host
- Enable log archiving and integrity checks on the manager itself
- Add MITRE ATT&CK mapping to the detection rules for triage context

**9. Individual contribution summary** (½ page)
What you personally built, what you can defend in questioning.

**10. Appendices**
Full command reference, complete screenshot index, configuration file excerpts.

---

## Part 6 — Quick command reference

```bash
# --- Session start ritual ---
curl -s https://checkip.amazonaws.com               # has my IP changed?
aws ec2 start-instances --instance-ids i-... i-...  # bring the lab up

# --- Manager health ---
sudo systemctl status wazuh-manager wazuh-indexer wazuh-dashboard
/var/ossec/bin/wazuh-control info                   # version
sudo /var/ossec/bin/agent_control -l                # agent status
free -h                                             # memory + swap
sudo tail -f /var/ossec/logs/ossec.log              # live manager log
sudo tail -f /var/ossec/logs/alerts/alerts.json     # live alerts

# --- Agent health (Linux) ---
sudo systemctl status wazuh-agent
sudo grep -A2 '<server>' /var/ossec/etc/ossec.conf  # confirm private IP
sudo tail -50 /var/ossec/logs/ossec.log
nc -zv 10.0.1.10 1514                               # can I reach the manager?

# --- Agent health (Windows PowerShell) ---
Get-Service WazuhSvc
Get-Content "C:\Program Files (x86)\ossec-agent\ossec.log" -Tail 50

# --- Restart after config change ---
sudo systemctl restart wazuh-agent                  # agent
sudo systemctl restart wazuh-manager                # manager

# --- Session end ritual ---
aws ec2 stop-instances --instance-ids i-... i-...   # stop paying for compute
```

**Key rule IDs to know for the defence:**

| Rule | Fires on | Level |
|---|---|---|
| 554 | File added to monitored directory | 5 |
| 550 | File modified in monitored directory | 7 |
| 553 | File deleted from monitored directory | 7 |
| 5710 | SSH login attempt with non-existent user | 5 |
| 5716 | SSH authentication failed | 5 |
| 5712 | SSHD brute force — multiple failures correlated | 10 |
| 5551 | Related brute-force correlation | 10 |
| 60122 / 60204 | Windows RDP brute force | 10 |

---

## Part 7 — What separates a pass from a strong pass

The assessment weights tell you where to spend effort:

| Area | Weight | What actually earns it |
|---|---|---|
| Working SOC lab and completeness | 30% | All four use cases proven with screenshots. No gaps. |
| Cyber security execution and alert analysis | 20% | The *explanations*. Anyone can screenshot an alert; explaining why rule 5712 matters more than 5716 is the differentiator. |
| Weekly milestones and working process | 15% | Evidence dated across eight weeks, not dumped in Week 7. Real troubleshooting entries. |
| Individual contribution | 15% | Clear statement of what you built and can defend. |
| Documentation and evidence | 10% | Labelled screenshots, clean diagrams, readable structure. |
| Final demonstration and defence | 10% | Rehearsed demo, confident answers, working fallback. |

Three specific things that lift the grade:

1. **Explain, do not describe.** "Rule 550 fired" is a description. "Rule 550 fired because the SHA256 no longer matched the baseline, and the `report_changes` diff shows the exact line added — this is how you catch a webshell dropped into a web root" is an explanation.
2. **Show judgement about the gap between lab and production.** The improvement plan is only 1–2 pages but it is the clearest signal of whether you understand what you built.
3. **Own the troubleshooting.** Problems you solved and documented are worth more than a lab that allegedly worked first time. Nobody believes it worked first time.

---

## Sources

- [Wazuh quickstart / all-in-one installation](https://documentation.wazuh.com/current/quickstart.html)
- [Wazuh agent installation — Linux](https://documentation.wazuh.com/current/installation-guide/wazuh-agent/wazuh-agent-package-linux.html)
- [Wazuh agent installation — Windows](https://documentation.wazuh.com/current/installation-guide/wazuh-agent/wazuh-agent-package-windows.html)
- [Wazuh 4.14.7 release notes — 29 July 2026](https://documentation.wazuh.com/current/release-notes/release-4-14-7.html)
- [Vulnerability detection — configuring scans](https://documentation.wazuh.com/current/user-manual/capabilities/vulnerability-detection/configuring-scans.html)
- [PoC — File integrity monitoring](https://documentation.wazuh.com/current/proof-of-concept-guide/poc-file-integrity-monitoring.html)
- [PoC — Detecting a brute-force attack](https://documentation.wazuh.com/current/proof-of-concept-guide/detect-brute-force-attack.html)
- [EC2 on-demand pricing](https://aws.amazon.com/ec2/pricing/on-demand/)
