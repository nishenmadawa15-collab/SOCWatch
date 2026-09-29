# FIM Configuration — agent-linux-1

Added to `/var/ossec/etc/ossec.conf` inside the `<syscheck>` block:

```xml
<directories check_all="yes" report_changes="yes" realtime="yes">/home/ubuntu/fim-test</directories>
```

Applied via `sudo systemctl restart wazuh-agent`, then verified active.

Backup of the pre-change config was kept at `/var/ossec/etc/ossec.conf.bak.<timestamp>` on the instance.
