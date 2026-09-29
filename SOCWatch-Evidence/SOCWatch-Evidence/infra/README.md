# Lab infrastructure (Terraform)

Recreates the VPC, subnet, security group and all four instances exactly as in the runbook, including 4 GB swap on the manager.

    cp terraform.tfvars.example terraform.tfvars   # set my_ip
    terraform init && terraform plan
    terraform apply
    # Screenshot the plan/apply output and AWS console as Week 2 evidence.

Notes
- Ask your mentor if Terraform is acceptable; if not, use the AWS CLI steps in the runbook. Either way, understand every resource.
- `.terraform/` (provider binary cache, ~700 MB) must never go into the evidence zip — exclude it explicitly when re-zipping. `.terraform.lock.hcl` is fine to keep (tiny, text-only).
- Windows Administrator password: EC2 console > Connect > RDP > Get password (upload ~/.ssh/socwatch private key). If AWS rejects an ed25519 key for Windows, create an RSA key pair for that instance.
- The Elastic IP keeps the dashboard URL stable across stop/start (public IPv4 addresses are billed hourly; terraform destroy when finished).
- Cleanup at the end: `terraform destroy`, then screenshot the empty instance list.
