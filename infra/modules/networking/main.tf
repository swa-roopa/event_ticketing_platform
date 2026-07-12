terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.primary, aws.secondary]
    }
  }
}

# ── PRIMARY REGION ──────────────────────────────────────────────
resource "aws_vpc" "primary" {
  provider             = aws.primary
  cidr_block           = var.primary_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = merge(var.tags, { Name = "${var.app_name}-vpc-primary" })
}

resource "aws_subnet" "primary_private_a" {
  provider          = aws.primary
  vpc_id            = aws_vpc.primary.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "${var.primary_region}a"
  tags = merge(var.tags, { Name = "${var.app_name}-private-primary-a" })
}

resource "aws_subnet" "primary_private_b" {
  provider          = aws.primary
  vpc_id            = aws_vpc.primary.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.primary_region}b"
  tags = merge(var.tags, { Name = "${var.app_name}-private-primary-b" })
}

resource "aws_internet_gateway" "primary" {
  provider = aws.primary
  vpc_id   = aws_vpc.primary.id
  tags = merge(var.tags, { Name = "${var.app_name}-igw-primary" })
}

resource "aws_db_subnet_group" "primary" {
  provider   = aws.primary
  name       = "${var.app_name}-${var.environment}-db-subnet-primary"
  subnet_ids = [aws_subnet.primary_private_a.id, aws_subnet.primary_private_b.id]
  tags = merge(var.tags, { Name = "${var.app_name}-db-subnet-primary" })
}

resource "aws_security_group" "primary_app" {
  provider    = aws.primary
  name        = "${var.app_name}-${var.environment}-app-sg-primary"
  description = "App security group - primary"
  vpc_id      = aws_vpc.primary.id

  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.app_name}-app-sg-primary" })
}

resource "aws_security_group" "primary_db" {
  provider    = aws.primary
  name        = "${var.app_name}-${var.environment}-db-sg-primary"
  description = "DB security group - primary"
  vpc_id      = aws_vpc.primary.id

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.primary_app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.app_name}-db-sg-primary" })
}

# ── SECONDARY REGION ─────────────────────────────────────────────
resource "aws_vpc" "secondary" {
  provider             = aws.secondary
  cidr_block           = var.secondary_vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = merge(var.tags, { Name = "${var.app_name}-vpc-secondary" })
}

resource "aws_subnet" "secondary_private_a" {
  provider          = aws.secondary
  vpc_id            = aws_vpc.secondary.id
  cidr_block        = "10.1.1.0/24"
  availability_zone = "${var.secondary_region}a"
  tags = merge(var.tags, { Name = "${var.app_name}-private-secondary-a" })
}

resource "aws_subnet" "secondary_private_b" {
  provider          = aws.secondary
  vpc_id            = aws_vpc.secondary.id
  cidr_block        = "10.1.2.0/24"
  availability_zone = "${var.secondary_region}b"
  tags = merge(var.tags, { Name = "${var.app_name}-private-secondary-b" })
}

resource "aws_internet_gateway" "secondary" {
  provider = aws.secondary
  vpc_id   = aws_vpc.secondary.id
  tags = merge(var.tags, { Name = "${var.app_name}-igw-secondary" })
}

resource "aws_db_subnet_group" "secondary" {
  provider   = aws.secondary
  name       = "${var.app_name}-${var.environment}-db-subnet-secondary"
  subnet_ids = [aws_subnet.secondary_private_a.id, aws_subnet.secondary_private_b.id]
  tags = merge(var.tags, { Name = "${var.app_name}-db-subnet-secondary" })
}

resource "aws_security_group" "secondary_app" {
  provider    = aws.secondary
  name        = "${var.app_name}-${var.environment}-app-sg-secondary"
  description = "App security group - secondary"
  vpc_id      = aws_vpc.secondary.id

  ingress {
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.app_name}-app-sg-secondary" })
}

resource "aws_security_group" "secondary_db" {
  provider    = aws.secondary
  name        = "${var.app_name}-${var.environment}-db-sg-secondary"
  description = "DB security group - secondary"
  vpc_id      = aws_vpc.secondary.id

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.secondary_app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.app_name}-db-sg-secondary" })
}