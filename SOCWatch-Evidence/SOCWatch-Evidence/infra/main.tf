terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}

variable "my_ip" { type = string }
variable "region" { default = "ap-south-1" }
variable "key_name" { default = "socwatch" }
variable "public_key_path" { default = "~/.ssh/socwatch.pub" }

provider "aws" {
  region = var.region
  default_tags { tags = { Project = "SOCWatch" } }
}

data "aws_ssm_parameter" "ubuntu" {
  name = "/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id"
}
data "aws_ssm_parameter" "windows" {
  name = "/aws/service/ami-windows-latest/Windows_Server-2022-English-Full-Base"
}
data "aws_ami" "rocky" {
  most_recent = true
  owners      = ["792107900819"] # Rocky Linux official
  filter {
    name   = "name"
    values = ["Rocky-9-EC2-Base-*.x86_64*"]
  }
  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

data "aws_availability_zones" "az" { state = "available" }

resource "aws_vpc" "lab" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags                 = { Name = "socwatch-vpc" }
}
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.lab.id
  tags   = { Name = "socwatch-igw" }
}
resource "aws_subnet" "lab" {
  vpc_id                  = aws_vpc.lab.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.az.names[0]
  map_public_ip_on_launch = true
  tags                    = { Name = "socwatch-subnet" }
}
resource "aws_route_table" "rt" {
  vpc_id = aws_vpc.lab.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}
resource "aws_route_table_association" "a" {
  subnet_id      = aws_subnet.lab.id
  route_table_id = aws_route_table.rt.id
}

resource "aws_security_group" "lab" {
  name        = "socwatch-lab-sg"
  description = "SOCWatch Wazuh SOC lab"
  vpc_id      = aws_vpc.lab.id

  ingress {
    description = "SSH admin"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }
  ingress {
    description = "Wazuh dashboard"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }
  ingress {
    description = "RDP admin"
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }
  ingress {
    description = "Agent events"
    from_port   = 1514
    to_port     = 1514
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
  ingress {
    description = "Agent enrolment"
    from_port   = 1515
    to_port     = 1515
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "socwatch-lab-sg" }
}

resource "aws_key_pair" "k" {
  key_name   = var.key_name
  public_key = file(pathexpand(var.public_key_path))
}

locals {
  swap = <<-EOT
    #!/bin/bash
    fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  EOT
}

resource "aws_instance" "manager" {
  ami                    = nonsensitive(data.aws_ssm_parameter.ubuntu.value)
  instance_type          = "t3.medium"
  subnet_id              = aws_subnet.lab.id
  private_ip             = "10.0.1.10"
  key_name               = aws_key_pair.k.key_name
  vpc_security_group_ids = [aws_security_group.lab.id]
  user_data              = local.swap
  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }
  tags = { Name = "wazuh-manager" }
}
resource "aws_eip" "manager" {
  instance = aws_instance.manager.id
  domain   = "vpc"
  tags     = { Name = "wazuh-manager-eip" }
}

resource "aws_instance" "linux1" {
  ami                    = nonsensitive(data.aws_ssm_parameter.ubuntu.value)
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.lab.id
  private_ip             = "10.0.1.21"
  key_name               = aws_key_pair.k.key_name
  vpc_security_group_ids = [aws_security_group.lab.id]
  root_block_device {
    volume_size = 8
    volume_type = "gp3"
  }
  tags = { Name = "agent-linux-1" }
}
resource "aws_instance" "linux2" {
  ami                    = data.aws_ami.rocky.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.lab.id
  private_ip             = "10.0.1.22"
  key_name               = aws_key_pair.k.key_name
  vpc_security_group_ids = [aws_security_group.lab.id]
  root_block_device {
    volume_size = 8
    volume_type = "gp3"
  }
  tags = { Name = "agent-linux-2" }
}
resource "aws_instance" "windows1" {
  ami                    = nonsensitive(data.aws_ssm_parameter.windows.value)
  instance_type          = "t3.small"
  subnet_id              = aws_subnet.lab.id
  private_ip             = "10.0.1.23"
  key_name               = aws_key_pair.k.key_name
  vpc_security_group_ids = [aws_security_group.lab.id]
  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }
  tags = { Name = "agent-windows-1" }
}

output "manager_public_ip" { value = aws_eip.manager.public_ip }
output "instance_ids" {
  value = join(" ", [aws_instance.manager.id, aws_instance.linux1.id, aws_instance.linux2.id, aws_instance.windows1.id])
}
output "dashboard_url" { value = "https://${aws_eip.manager.public_ip}" }
