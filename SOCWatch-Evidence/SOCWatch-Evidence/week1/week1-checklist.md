# Week 1 Checklist
- [ ] Read the brief; list questions for first sync
- [x] AWS account + IAM user (no root use) — `socwatch-admin` created 2026-09-20, PowerUserAccess, programmatic access only. MFA on root: NOT YET DONE (requires account owner's authenticator app)
- [x] $20 budget with email alert -> created 2026-09-20 ("My Monthly Cost Budget", alerts at 85%/100% actual + 100% forecasted, emailed to account owner). Screenshot still needed at week1/01-billing-budget.png
- [ ] Evidence folder in place (this folder) -> screenshot
- [ ] Architecture diagram reviewed (diagrams/architecture-draft.png)
- [x] SSH key: `ssh-keygen -t ed25519 -f ~/.ssh/socwatch -C "socwatch-lab"` — generated (ed25519, no passphrase)
- [ ] Risk list + inventory + update template (done)
- [ ] Mentor approves scope

## Session note — 2026-09-20
Completed directly in the AWS console (account REDACTED, region ap-south-1):
- Created IAM user `socwatch-admin` (Access Key ID redacted — see local credentials file, not tracked in git — PowerUserAccess policy, no console password). Secret access key was downloaded once to a local CSV and never recorded here.
- Created monthly cost budget "$20.00" with three alerts (85% actual, 100% actual, 100% forecasted) emailed to the account owner.
- Confirmed no existing IAM users/key pairs prior to this session — account was root-only.
- Did NOT import the SSH key pair manually into EC2 — `infra/main.tf`'s `aws_key_pair.k` resource will create it on `terraform apply`, so a manual import would collide.
- Still pending: `aws configure --profile socwatch` on the local workstation (must be run by the account owner directly so the secret key is never shared), root MFA enrollment, `terraform plan`/`terraform apply` review and approval.
See `SOCWatch-Installation-and-Project-Guide.docx` in `report/` for the full step-by-step installation guide and current status.
