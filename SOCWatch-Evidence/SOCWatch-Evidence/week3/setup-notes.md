# Week 3 setup notes — Wazuh manager install

Installed via the official all-in-one assistant on `wazuh-manager` (Ubuntu 22.04, private IP 10.0.8.82):

```bash
curl -sO https://packages.wazuh.com/4.14/wazuh-install.sh
sudo bash ./wazuh-install.sh -a
```

Confirmed version: v4.14.7 (rc1), server type — matches the latest release documented in the runbook.

**Deviation from the runbook's plain walkthrough:** the manager suffered a disk-full outage on 2026-09-21
(`/var/ossec/queue/vd_updater` filled the root disk with stale vulnerability-feed download retries),
which took down `wazuh-manager` and `wazuh-indexer`. Full root-cause and fix are in `troubleshooting-log.md`
(entry: "Wazuh manager disk-full outage"). Current disk usage is healthy at 40% (35GB free) after the fix.

All three core services (`wazuh-manager`, `wazuh-indexer`, `wazuh-dashboard`) confirmed `active (running)`
via `systemctl status` — see `services-running.txt` in this folder for full output.

Dashboard reachable at `https://13.126.121.206` (self-signed certificate, expected — the install assistant
generates its own). Login screen not yet screenshotted for evidence — browser automation cannot click through
Chrome's native certificate-warning interstitial, so this requires a manual visit and screenshot.
