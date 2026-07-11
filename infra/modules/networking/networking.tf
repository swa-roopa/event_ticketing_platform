# ============== PRIMARY REGION NETWORKING (US-EAST-1) ==============
resource "aws_vpc" "primary" {
  provider             = aws.primary
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.tags, { Name = "${local.app_name}-vpc-primary" })
}

resource "aws_subnet" "primary_private_a" {
  provider          = aws.primary
  vpc_id            = aws_vpc.primary.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = merge(local.tags, { Name = "${local.app_name}-private-primary-a" })
}

resource "aws_subnet" "primary_private_b" {
  provider          = aws.primary
  vpc_id            = aws_vpc.primary.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"

  tags = merge(local.tags, { Name = "${local.app_name}-private-primary-b" })
}

resource "aws_subnet" "primary_public_a" {
  provider                = aws.primary
  vpc_id                  = aws_vpc.primary.id
  cidr_block              = "10.0.10.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  tags = merge(local.tags, { Name = "${local.app_name}-public-primary-a" })
}

resource "aws_subnet" "primary_public_b" {
  provider                = aws.primary
  vpc_id                  = aws_vpc.primary.id
  cidr_block              = "10.0.11.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = true

  tags = merge(local.tags, { Name = "${local.app_name}-public-primary-b" })
}

resource "aws_internet_gateway" "primary" {
  provider = aws.primary
  vpc_id   = aws_vpc.primary.id

  tags = merge(local.tags, { Name = "${local.app_name}-igw-primary" })
}

resource "aws_route_table" "primary_public" {
  provider = aws.primary
  vpc_id   = aws_vpc.primary.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.primary.id
  }

  tags = merge(local.tags, { Name = "${local.app_name}-rt-public-primary" })
}

resource "aws_route_table_association" "primary_public_a" {
  provider       = aws.primary
  subnet_id      = aws_subnet.primary_public_a.id
  route_table_id = aws_route_table.primary_public.id
}

resource "aws_route_table_association" "primary_public_b" {
  provider       = aws.primary
  subnet_id      = aws_subnet.primary_public_b.id
  route_table_id = aws_route_table.primary_public.id
}

resource "aws_db_subnet_group" "primary" {
  provider   = aws.primary
  name       = "${local.app_name}-db-subnet-primary"
  subnet_ids = [aws_subnet.primary_private_a.id, aws_subnet.primary_private_b.id]

  tags = merge(local.tags, { Name = "${local.app_name}-db-subnet-primary" })
}

resource "aws_security_group" "primary_db" {
  provider    = aws.primary
  name        = "${local.app_name}-db-sg-primary"
  description = "Security group for Aurora database in Primary region"
  vpc_id      = aws_vpc.primary.id

  ingress {
    description     = "MySQL from application"
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

  tags = merge(local.tags, { Name = "${local.app_name}-db-sg-primary" })
}

resource "aws_security_group" "primary_app" {
  provider    = aws.primary
  name        = "${local.app_name}-app-sg-primary"
  description = "Security group for application in Primary region"
  vpc_id      = aws_vpc.primary.id

  ingress {
    description = "HTTP"
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

  tags = merge(local.tags, { Name = "${local.app_name}-app-sg-primary" })
}

# ============== SECONDARY REGION NETWORKING (US-EAST-2) ==============
resource "aws_vpc" "secondary" {
  provider             = aws.secondary
  cidr_block           = "10.1.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.tags, { Name = "${local.app_name}-vpc-secondary" })
}

resource "aws_subnet" "secondary_private_a" {
  provider          = aws.secondary
  vpc_id            = aws_vpc.secondary.id
  cidr_block        = "10.1.1.0/24"
  availability_zone = "us-east-2a"

  tags = merge(local.tags, { Name = "${local.app_name}-private-secondary-a" })
}

resource "aws_subnet" "secondary_private_b" {
  provider          = aws.secondary
  vpc_id            = aws_vpc.secondary.id
  cidr_block        = "10.1.2.0/24"
  availability_zone = "us-east-2b"

  tags = merge(local.tags, { Name = "${local.app_name}-private-secondary-b" })
}

resource "aws_subnet" "secondary_public_a" {
  provider                = aws.secondary
  vpc_id                  = aws_vpc.secondary.id
  cidr_block              = "10.1.10.0/24"
  availability_zone       = "us-east-2a"
  map_public_ip_on_launch = true

  tags = merge(local.tags, { Name = "${local.app_name}-public-secondary-a" })
}

resource "aws_subnet" "secondary_public_b" {
  provider                = aws.secondary
  vpc_id                  = aws_vpc.secondary.id
  cidr_block              = "10.1.11.0/24"
  availability_zone       = "us-east-2b"
  map_public_ip_on_launch = true

  tags = merge(local.tags, { Name = "${local.app_name}-public-secondary-b" })
}

resource "aws_internet_gateway" "secondary" {
  provider = aws.secondary
  vpc_id   = aws_vpc.secondary.id

  tags = merge(local.tags, { Name = "${local.app_name}-igw-secondary" })
}

resource "aws_route_table" "secondary_public" {
  provider = aws.secondary
  vpc_id   = aws_vpc.secondary.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.secondary.id
  }

  tags = merge(local.tags, { Name = "${local.app_name}-rt-public-secondary" })
}

resource "aws_route_table_association" "secondary_public_a" {
  provider       = aws.secondary
  subnet_id      = aws_subnet.secondary_public_a.id
  route_table_id = aws_route_table.secondary_public.id
}

resource "aws_route_table_association" "secondary_public_b" {
  provider       = aws.secondary
  subnet_id      = aws_subnet.secondary_public_b.id
  route_table_id = aws_route_table.secondary_public.id
}

resource "aws_db_subnet_group" "secondary" {
  provider   = aws.secondary
  name       = "${local.app_name}-db-subnet-secondary"
  subnet_ids = [aws_subnet.secondary_private_a.id, aws_subnet.secondary_private_b.id]

  tags = merge(local.tags, { Name = "${local.app_name}-db-subnet-secondary" })
}

resource "aws_security_group" "secondary_db" {
  provider    = aws.secondary
  name        = "${local.app_name}-db-sg-secondary"
  description = "Security group for Aurora database in Secondary region"
  vpc_id      = aws_vpc.secondary.id

  ingress {
    description     = "MySQL from application"
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

  tags = merge(local.tags, { Name = "${local.app_name}-db-sg-secondary" })
}

resource "aws_security_group" "secondary_app" {
  provider    = aws.secondary
  name        = "${local.app_name}-app-sg-secondary"
  description = "Security group for application in Secondary region"
  vpc_id      = aws_vpc.secondary.id

  ingress {
    description = "HTTP"
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

  tags = merge(local.tags, { Name = "${local.app_name}-app-sg-secondary" })
}
