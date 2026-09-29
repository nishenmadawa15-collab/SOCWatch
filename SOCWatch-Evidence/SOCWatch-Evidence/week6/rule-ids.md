# Week 6 — Rule IDs Fired

## Vulnerability detection

- Feed enabled by default in Wazuh 4.14 (`<vulnerability-detection><enabled>yes</enabled>`).
- Feed download completed successfully (`Feed update process completed`, 2026-09-22 07:11:40 UTC).
- **3,910 vulnerability findings** indexed across the fleet at time of check (`wazuh-states-vulnerabilities*` count via the indexer API). No deliberately-outdated package was needed — real, unpatched packages on the base AMIs already produced findings.

## Authentication failures / brute force

Test: 12 failed SSH logins as `baduser` (wrong password, no valid key) from **agent-linux-2** (`10.0.11.208`) targeting **agent-linux-1** (`10.0.0.164`) over the private network, 2026-09-22 ~18:47:09–18:47:11 UTC.

| Rule | Level | Description | Count fired |
|---|---|---|---|
| 5710 | 5 | Attempt to log in with a non-existent user | 12 |
| 5712 | **10** | sshd brute force — multiple failures correlated, non-existent user | 1 (correlation alert) |

**Rule 5712 detail** (the correlation alert — demonstrates Wazuh's frequency/timeframe rule engine, not just single-event matching):
```
Rule: 5712 (level 10) -> 'sshd: brute force trying to get access to the system. Non existent user.'
Src IP: 10.0.11.208
Src Port: 36080
(6+ prior 5710 events from the same source correlated within the rule's timeframe window)
```

Source IP `10.0.11.208` (agent-linux-2) was correctly attributed as the attacking host.

## Still needed for the final evidence set

Dashboard screenshots — CVE list with severity/package/CVE ID, one CVE expanded with CVSS score, and the 5712 alert expanded (Security Events, filter `rule.id: (5710 OR 5716 OR 5712 OR 5551)`). Automation couldn't capture these due to a Chrome limitation with the manager's self-signed certificate.
