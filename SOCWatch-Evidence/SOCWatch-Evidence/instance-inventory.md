# Instance Inventory (LIVE — confirmed via AWS Console + SSH, 2026-09-24)

Provisioned manually through the AWS Console (EC2 launch wizard), not via `infra/main.tf` — actual
values differ from the Terraform plan (instance types, IP scheme, VPC/subnet names). Terraform is
kept as a reference/alternative IaC path but was not the method actually used; do not run
`terraform apply` against this account without first reconciling state (it would try to create
duplicate VPC/SG/instances).

| Name | Role | Instance ID | OS/AMI | Type / Disk | Private IP | Public IP | State | Wazuh Agent ID |
|---|---|---|---|---|---|---|---|---|
| wazuh-manager | Server + indexer + dashboard | `i-0e59209880db2b06a` | Ubuntu 22.04 | m7i-flex.large / 58GB | 10.0.8.82 | 13.126.121.206 (**no Elastic IP — changes on stop/start**) | Running | 000 (Active/Local) |
| agent-linux-1 | Endpoint 1 | `i-09950d607c6484e2b` | Ubuntu 22.04 | t3.micro | 10.0.0.164 | 3.6.94.240 | Running | 001 (Active) |
| agent-linux-2 | Endpoint 2 | `i-0b543a19841f7e3bd` | **Debian 13** (corrected — originally planned as Rocky Linux 9, confirmed actual OS via SSH; login user is `admin`) | t3.micro | 10.0.11.208 | 3.109.139.94 | Running | 002 (Active) |
| agent-windows-1 | Endpoint 3 | `i-0d09166ac099047f5` | Windows Server 2022 | t3.small | 10.0.5.116 | 3.111.168.97 (**no Elastic IP — changes on stop/start**) | Running | 003 (Active) |

VPC `vpc-005b5a9b313fd93d0` ("socwatch-vpc"), subnet `subnet-05b1c6bab1faed892` ("socwatch-subnet-public1-ap-south-1a"), AZ ap-south-1a.

Security group `sg-0852845171781156b` — 5 inbound rules present:

| Type | Port | Source | Purpose |
|---|---|---|---|
| SSH | 22 | 0.0.0.0/0 | SSH admin |
| HTTPS | 443 | 0.0.0.0/0 | Wazuh dashboard |
| RDP | 3389 | 0.0.0.0/0 | RDP admin |
| Custom TCP | 1514 | 10.0.0.0/16 | Agent events |
| Custom TCP | 1515 | 10.0.0.0/16 | Agent enrolment |

**Note on admin ports being 0.0.0.0/0:** this is a deliberate, documented tradeoff (see troubleshooting log)
— the account owner's mobile ISP uses carrier-grade NAT across a shifting range of IPs wider than even a /21,
which made any IP-restricted rule unworkable. SSH key auth and dashboard/Windows login remain the actual
access control. Not an oversight.

**Wazuh manager:** v4.14.7 (rc1), all three core services (`wazuh-manager`, `wazuh-indexer`, `wazuh-dashboard`)
active. All 4 nodes (manager + 3 agents) show `Active` via `agent_control -l` as of 2026-09-24.

**Elastic IPs:** neither the manager nor the Windows agent has one allocated — both public IPs will change on
stop/start. Worth allocating before the final demo (Week 7/8) so the dashboard URL doesn't need updating on
the day.
