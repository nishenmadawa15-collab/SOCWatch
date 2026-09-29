# SSH hardening notes (Week 2)

Checked on `wazuh-manager` (10.0.8.82) via:
```bash
sudo grep -iE 'PasswordAuthentication|PermitRootLogin' /etc/ssh/sshd_config /etc/ssh/sshd_config.d/*.conf
```

Result:
```
/etc/ssh/sshd_config.d/60-cloudimg-settings.conf:PasswordAuthentication no
/etc/ssh/sshd_config:#PermitRootLogin prohibit-password   (Ubuntu default, commented — not overridden)
```

**Password authentication is disabled** — enforced via Ubuntu's cloud-image drop-in config
(`60-cloudimg-settings.conf`), which takes precedence over the base `sshd_config`. This achieves
the same result as the runbook's manual `sed` commands without needing to edit the base file directly.

**Root login** uses Ubuntu's cloud-image default of `prohibit-password` (root cannot log in with a
password, only with a key if explicitly permitted) — not explicitly overridden, but already secure
by default.

Key-based login confirmed working (see `ssh-connection-proof.txt`), password auth confirmed rejected
by the drop-in config. No changes were needed since the base AMI already ships hardened.
