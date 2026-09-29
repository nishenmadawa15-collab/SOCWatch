#!/usr/bin/env bash
set -e
"$(dirname "$0")/check-ip.sh"
IDS=$(cd "$(dirname "$0")/../infra" && terraform output -raw instance_ids)
aws ec2 start-instances --instance-ids $IDS >/dev/null && echo "Instances starting"
