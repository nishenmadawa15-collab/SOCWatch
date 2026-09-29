#!/usr/bin/env bash
set -e
IDS=$(cd "$(dirname "$0")/../infra" && terraform output -raw instance_ids)
aws ec2 stop-instances --instance-ids $IDS >/dev/null && echo "Instances stopping - compute billing stops"
