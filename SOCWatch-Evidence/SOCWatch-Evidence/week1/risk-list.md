# Risk List

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | Public IP changes, lab appears broken | High | Low | Run scripts/check-ip.sh at session start; update SG rule |
| 2 | t3.medium out of memory, indexer dies | Medium | High | 4 GB swap before install (done via Terraform user_data); monitor `free -h` |
| 3 | AWS costs exceed budget | Medium | Medium | Stop instances every session; $20 budget alarm at 80% |
| 4 | Agent enrolled with public instead of private IP | Medium | High | WAZUH_MANAGER=10.0.1.10; verify with `agent_control -l` |
| 5 | CVE feed not populated by Week 6 | Medium | Medium | Start manager early; allow 1+ hr |
| 6 | Lab breaks before evidence captured | Medium | Critical | Screenshot immediately, never retrospectively |
| 7 | Locked out of SSH after hardening | Low | High | Keep an open session while testing |
| 8 | Live demo fails | Medium | High | Screenshot fallback in second window |
| 9 | Windows MSI enrolment fails | Low | Medium | Check WazuhSvc and ossec.log |
| 10 | Credentials committed or screenshotted | Low | Critical | Redact at capture; passwords outside evidence folder |
