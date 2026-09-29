# IP schema (Week 7)

VPC `vpc-005b5a9b313fd93d0` ("socwatch-vpc"), subnet `subnet-05b1c6bab1faed892`, AZ ap-south-1a.

| Host | Role | Private IP | Public IP | Notes |
|---|---|---|---|---|
| wazuh-manager | Server + indexer + dashboard | 10.0.8.82 | 13.126.121.206 | No Elastic IP — public IP changes on stop/start |
| agent-linux-1 | Endpoint 1 (Ubuntu 22.04) | 10.0.0.164 | 3.6.94.240 | Agent ID 001 |
| agent-linux-2 | Endpoint 2 (Debian 13) | 10.0.11.208 | 3.109.139.94 | Agent ID 002, login user `admin` |
| agent-windows-1 | Endpoint 3 (Windows Server 2022) | 10.0.5.116 | 3.111.168.97 | Agent ID 003, no Elastic IP |

**Traffic flow:** all three agents are configured with `WAZUH_MANAGER` set to the manager's **private** IP
(10.0.8.82), never the public IP — agent → manager traffic never leaves the VPC. Admin access (SSH/RDP/dashboard)
uses the manager and Windows agent's public IPs, restricted at the security group to the rules in
`instance-inventory.md`.

**Data flow narrative:** endpoint event → local Wazuh agent → TCP 1514 (private) → `wazuh-remoted` on the
manager → `wazuh-analysisd` (decoder + rule matching) → indexed into `wazuh-indexer` (OpenSearch) → surfaced
in the `wazuh-dashboard`. Agent enrolment (one-time key exchange) uses TCP 1515 the same way.

**Known gap:** neither the manager nor the Windows agent has an Elastic IP allocated, so both public IPs will
change if either instance is stopped and restarted. Recommended before the final demo (Week 8): allocate and
associate Elastic IPs to both, and update this table plus the dashboard bookmark accordingly.
