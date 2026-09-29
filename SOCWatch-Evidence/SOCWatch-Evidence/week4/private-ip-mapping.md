# Agent private IP mapping (Week 4)

| Agent name | Agent ID | Private IP | OS |
|---|---|---|---|
| wazuh-manager | 000 | 10.0.8.82 | Ubuntu 22.04 (server) |
| agent-linux-1 | 001 | 10.0.0.164 | Ubuntu 22.04 |
| agent-linux-2 | 002 | 10.0.11.208 | Debian 13 (corrected from planned Rocky Linux 9 — confirmed via SSH) |
| agent-windows-1 | 003 | 10.0.5.116 | Windows Server 2022 |

All agents point at the manager's **private** IP (10.0.8.82), not the public IP, per the runbook's Part 3.

## Windows agent enrolment (2026-09-23)

Installed remotely via AWS Systems Manager Run Command (`AWS-RunPowerShellScript`) rather than an interactive RDP session, after discovering the agent had never actually been installed despite an earlier RDP attempt. MSI install used `Start-Process msiexec.exe -ArgumentList $msiArgs -Wait -PassThru` with the arguments passed as a PowerShell array — this avoids the backtick line-continuation quoting problems that silently broke earlier attempts.

```
msiexec exit code: 0
Status   Name      DisplayName
------   ----      -----------
Running  WazuhSvc  Wazuh
```

Manager-side confirmation (`/var/ossec/logs/ossec.log`):
```
2026/09/23 19:19:18 wazuh-authd: INFO: Received request for a new agent (agent-windows-1) from: 10.0.5.116
2026/09/23 19:19:18 wazuh-authd: INFO: Agent key generated for 'agent-windows-1' (requested by any)
```

`agent_control -l` confirms all 4 nodes (manager + 3 agents) Active — see `agent-control-list.txt` in this folder.

## Windows Event Log ingestion — bonus check (2026-09-24)

The Linux agents' log ingestion was proven in weeks 5-6 (PAM/sudo/sshd events). The Windows agent's own event ingestion (Application/Security/System via `eventchannel`) had not been separately verified until this session — see `windows-eventlog-ingestion-proof.txt` in this folder for the full evidence: `WazuhSvc` confirmed running, `ossec.conf` confirmed monitoring all 3 Windows event channels, and real `windows,windows_application`-tagged alerts (rule 60642) observed reaching the manager from `agent-windows-1` via `EventChannel`, not just the connection heartbeat.
