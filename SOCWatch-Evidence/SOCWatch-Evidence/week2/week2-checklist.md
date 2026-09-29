# Week 2 Checklist — Create the AWS foundation

## Status as of 2026-09-22: infrastructure exists, provisioned manually (not via Terraform)

Confirmed live via AWS Console (logged in as `socwatch-admin`, account REDACTED, ap-south-1):
all 4 instances exist (`wazuh-manager`, `agent-linux-1`, `agent-linux-2`, `agent-windows-1`), the
security group has all 5 required rules, and a self-signed TLS handshake on the manager's public IP
port 443 suggests Wazuh may already be installed. Real IPs and details are in `instance-inventory.md`.

**Important:** this was NOT done via `infra/main.tf` — instance types, private-IP scheme, and
VPC/subnet naming all differ from the Terraform plan (real values use the EC2 "VPC and more" launch
wizard's default naming). Terraform's local state has no knowledge of these resources. Do not run
`terraform apply` in this account without first either importing the existing resources into
Terraform state or accepting that Terraform is documentation-only from here on — running apply blind
would attempt to create duplicate VPC/SG/instances.

## Done
- [x] VPC + subnet created (`socwatch-vpc` / `socwatch-subnet-public1-ap-south-1a`)
- [x] Security group `sg-0852845171781156b` with SSH/443/RDP (scoped, not 0.0.0.0/0) + 1514/1515 from VPC CIDR
- [x] All 4 instances launched with correct AMIs/roles (types differ slightly from plan — manager is m7i-flex.large not t3.medium)
- [x] SSH keypair generated in Week 1
- [x] `instance-inventory.md` filled with real private/public IPs (2026-09-22)
- [x] AWS CLI/Terraform prep done in parallel (kept as reference — see caveat above)

## Still needed
- [ ] **Allocate + associate an Elastic IP to wazuh-manager** — currently on an auto-assigned public IP (13.233.97.249) that will change on stop/start, breaking the dashboard URL. Do this before relying on the URL in the report/demo.
- [ ] Confirm Wazuh dashboard actually loads past the self-signed cert warning (manual browser check — Chrome's native interstitial can't be automated)
- [ ] SSH-harden manager + both Linux agents (`PasswordAuthentication no`, `PermitRootLogin no`)
- [ ] `apt`/`dnf` update all instances
- [ ] Start `agent-windows-1` (currently stopped) when ready to configure it
- [ ] Connectivity test: manager → each agent private IP
- [ ] Root MFA enrollment (needs account owner's authenticator app — unrelated to any of the above, still pending)
- [ ] Decide and document in the report: Terraform was written and validated but the actual lab was hand-provisioned via console — explain why (credential friction) so it reads as a deliberate pivot, not an inconsistency

## Capture
- [ ] `week2/security-group-rules.png`
- [ ] `week2/instance-list.png`
- [x] `week2/instance-inventory.md` — filled with real IPs (root-level file, not yet copied into this week folder — do that when finalizing evidence)
- [ ] `week2/ssh-connection-proof.png`
- [ ] `week2/hardening-notes.md`
- [x] `troubleshooting-log.md` — credential-chain entry (2026-09-22); add an entry here too documenting the Terraform-vs-manual pivot
