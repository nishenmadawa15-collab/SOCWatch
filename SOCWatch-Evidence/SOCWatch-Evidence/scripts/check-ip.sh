#!/usr/bin/env bash
# Compare current public IP with the one in terraform.tfvars; warn if changed.
CUR=$(curl -s https://checkip.amazonaws.com)
SET=$(grep -E '^my_ip' "$(dirname "$0")/../infra/terraform.tfvars" 2>/dev/null | cut -d'"' -f2)
echo "Current IP: $CUR   Configured: ${SET:-none}"
[ "$CUR" = "${SET%/32}" ] && echo "OK" || echo "CHANGED -> edit terraform.tfvars and run: cd infra && terraform apply"
