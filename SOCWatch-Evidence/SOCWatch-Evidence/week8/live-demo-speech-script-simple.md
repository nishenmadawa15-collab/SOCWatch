# Week 8 Live Demo — Simple Speech Script

This is written the way you'd actually SAY it out loud, in plain everyday words.
Practice it a few times so it sounds natural, not memorized.

---

## 1. Opening (say this first)

"Hi, I'm going to show you my SOC Watch project. This is a small security monitoring
system I built on AWS. I have one server that watches over three computers — one
Windows machine and two Linux machines. This watching server is called Wazuh.

My goal was to show four things a real security team needs: seeing what's happening
on the computers, knowing if a file gets changed, finding software with security
holes, and catching someone trying to break in with a password guessing attack.

Let me show you the dashboard first."

*(Open the dashboard, show the Agents page — all agents green/active)*

"You can see all three computers are online and being watched right now. I also want
to mention — the network is currently open to any IP address for admin access. That
wasn't a mistake. My home internet keeps changing IP addresses because of how my
mobile provider works, so I had to open it up so I wouldn't lock myself out. My real
protection is the SSH key and passwords, not the network rule. I wrote this decision
down in my troubleshooting notes."

---

## 2. Use Case 1 — Seeing what's happening (Log Ingestion)

"The first thing the system does is collect logs — basically a record of everything
that happens on each computer, like logins, commands, and errors."

*(Go to Security Events, filter by a computer name)*

"Here you can see real events coming in. If it looks quiet, I can go generate one
live."

*(SSH into a Linux agent, run a simple `sudo` command)*

"I just ran a command on the Linux machine, and if I refresh here... there it is,
showing up in the dashboard. It shows the raw log, which rule matched it, and which
computer it came from. I also checked the Windows machine separately, and its logs
come through the same way."

---

## 3. Use Case 2 — Noticing file changes (FIM)

"This next part is my favorite, because I can show it live and it's the clearest
proof that this works."

*(SSH in, then run the three commands: create file, edit file, delete file)*

"I just did three things: created a file, changed it, and deleted it. Watch the
dashboard."

*(Refresh, filter by the FIM rule IDs)*

"Here's the file being created... here's it being changed — and look, it even shows
me exactly what changed inside the file, like a before-and-after comparison... and
here's the deletion. This matters because if someone breaks into a server and tries
to plant malware or tamper with a config file, this is how you'd catch it immediately."

---

## 4. Use Case 3 — Finding risky software (Vulnerability Detection)

*(Open Vulnerability Detection for an agent)*

"This part scans the software installed on each computer and checks it against a
database of known security weaknesses. Right now it's found a few thousand issues on
just my two test machines — that number will look different on demo day, and that's
completely normal, it updates constantly."

*(Click into one finding)*

"If I open one of these, it tells me how serious it is, what version is affected,
and what version actually fixes it. So instead of just knowing 'this software is
installed,' I know 'this software installed here is actually dangerous.'"

---

## 5. Use Case 4 — Catching a break-in attempt (Brute-Force Detection)

"This last part is the most important one — showing that the system can catch an
attacker trying to guess a password."

*(Either replay saved evidence, or run the loop of 12 failed SSH logins live)*

"I'm going to try logging into one machine with the wrong password, twelve times in
a row, like an attacker would."

*(Filter dashboard by the brute-force rule IDs)*

"You can see each failed attempt individually here... but watch this — the system is
smart enough to notice that twelve failures from the same source in a short time
isn't just bad luck, it's an attack. So it creates one bigger, higher-priority alert
that combines all twelve into a single warning and flags the attacker's IP address.
That's the real value here — turning a pile of small events into one clear signal
that something bad is happening."

---

## 6. How I handled problems along the way

"I also want to show that this wasn't just something that worked perfectly on the
first try. I kept a troubleshooting log the whole time."

*(Briefly show troubleshooting-log.md)*

"For example, at one point the server's hard drive filled up completely and the
whole system crashed. I found out it was a background update process that kept
failing and filling up storage with junk files. I cleared the space and restarted
the services, and it came back healthy. I think showing how I diagnose and fix real
problems is just as important as showing the features working."

---

## 7. Closing

"So to sum up — I built a working security monitoring lab with one manager watching
three computers, and I proved all four detection use cases with real evidence, not
just theory. I also ran into real problems and fixed them myself, and I've written
down what I'd improve if this were a real production system — things like using a
proper SSL certificate, a VPN instead of open network access, and mapping alerts to
known attack techniques.

That's my project. Happy to answer any questions."

---

## If they ask you something tricky — simple answers

**"Why is the network open to everyone?"**
"My mobile internet keeps changing my IP address, so a strict rule kept locking me
out. I decided the SSH key and login passwords are my real protection, and I wrote
that decision down as a deliberate tradeoff, not an oversight."

**"Why didn't you use Terraform to build everything automatically?"**
"I set it up manually through the AWS console because I couldn't get my local
command-line access working in time and didn't want to stay stuck. I still kept the
Terraform files as a reference for how it should be automated."

**"What would you change for a real company?"**
"Six things: a real trusted SSL certificate instead of the warning one, a VPN
instead of open network access, backup servers instead of just one, sending logs
somewhere for long-term storage, tuning automatic responses, and mapping alerts to
a standard attack framework called MITRE ATT&CK."

**"What was the hardest part?"**
"The server ran out of disk space and crashed completely. I had to figure out which
process was filling it up, clear it safely, and restart everything in the right
order. That taught me more than anything that went smoothly."

---

## Quick reminders before you go live

- Start all 4 instances first, give them 2-3 minutes to boot.
- Log into the dashboard yourself first and click through the certificate warning
  BEFORE your mentor is watching.
- Keep the evidence folder and report open in another tab as backup.
- Talk slower than feels natural — it always sounds faster to the listener than it
  feels to you.
- Stop the instances again after the demo to avoid extra AWS cost.
