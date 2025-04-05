# Everyrealm Bonus Claims Application

**A Scalable Microservices Platform for Bonus Program Management**

![AWS](https://img.shields.io/badge/AWS-Cloud_Infrastructure-orange)
![CDK](https://img.shields.io/badge/CDK-Infrastructure_as_Code-blue)
![Microservices](https://img.shields.io/badge/Architecture-Microservices-green)
![CI/CD](https://img.shields.io/badge/DevOps-CI/CD_Pipeline-purple)

## Overview

The Everyrealm Bonus Claims Application is an enterprise-grade platform for managing digital bonus and reward programs. Built with AWS CDK, it provides a resilient and scalable infrastructure with multi-environment support (development and production), automated CI/CD pipeline, and high availability across multiple Availability Zones.

## Live Environments

### Development Environment
- **Base URL**: http://bonus--Bonus-ZPSSLRiKkJPW-1496140858.us-east-2.elb.amazonaws.com
- **Status**: Active
- **Health Check**: [View Health Status](http://bonus--Bonus-ZPSSLRiKkJPW-1496140858.us-east-2.elb.amazonaws.com/health)
- **Branch**: `dev`

### Production Environment
- **Base URL**: http://bonus--Bonus-uxas1x2K80Vd-1998251251.us-east-2.elb.amazonaws.com
- **Status**: Active
- **Health Check**: [View Health Status](http://bonus--Bonus-uxas1x2K80Vd-1998251251.us-east-2.elb.amazonaws.com/health)
- **Branch**: `main`

## Architecture

The application consists of the following components:

1. **Network Layer**: VPC with public and private subnets across multiple Availability Zones
2. **Database Layer**: DynamoDB for high-performance, scalable NoSQL data storage
3. **Compute Layer**: ECS Fargate for serverless container orchestration
4. **Microservices**:
   - **User Service**: Handles creation of bonus claims
   - **Admin Service**: Manages retrieval and administration of bonus claims
5. **API Gateway**: Application Load Balancer for routing traffic to appropriate microservices
6. **CI/CD Pipeline**: Automated GitHub Actions workflow for continuous deployment
7. **Monitoring**: CloudWatch logs and metrics for performance monitoring

## Quick Start - Test the API

You can immediately test the APIs using the following commands:

### Development Environment

```bash
# 1. Check health status
curl -v http://bonus--Bonus-ZPSSLRiKkJPW-1496140858.us-east-2.elb.amazonaws.com/health

# 2. Create a bonus claim
curl -X POST http://bonus--Bonus-ZPSSLRiKkJPW-1496140858.us-east-2.elb.amazonaws.com/add-bonus-claim \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "amount": 500,
    "source": "referral",
    "campaign": "summer2023"
  }'

# 3. Retrieve a bonus claim (using the bonusId from previous response)
curl "http://bonus--Bonus-ZPSSLRiKkJPW-1496140858.us-east-2.elb.amazonaws.com/get-bonus-claim?userId=user123&bonusId=BONUS_ID"
```

### Production Environment

```bash
# 1. Check health status
curl -v http://bonus--Bonus-uxas1x2K80Vd-1998251251.us-east-2.elb.amazonaws.com/health

# 2. Create a bonus claim
curl -X POST http://bonus--Bonus-uxas1x2K80Vd-1998251251.us-east-2.elb.amazonaws.com/add-bonus-claim \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user456",
    "amount": 1000,
    "source": "purchase",
    "campaign": "winter2023"
  }'

# 3. Retrieve a bonus claim (using the bonusId from previous response)
curl "http://bonus--Bonus-uxas1x2K80Vd-1998251251.us-east-2.elb.amazonaws.com/get-bonus-claim?userId=user456&bonusId=BONUS_ID"
```

## API Reference

### User Service API

#### Create Bonus Claim
- **Endpoint**: `/add-bonus-claim`
- **Method**: POST
- **Description**: Creates a new bonus claim for a user
- **Request Body**:
  ```json
  {
    "userId": "string",
    "amount": "number",
    "source": "string",
    "campaign": "string"
  }
  ```
- **Response**:
  ```json
  {
    "bonusId": "string",
    "userId": "string",
    "amount": "number",
    "status": "string",
    "timestamp": "string",
    "metadata": {
      "source": "string",
      "campaign": "string"
    }
  }
  ```

### Admin Service API

#### Get Bonus Claim
- **Endpoint**: `/get-bonus-claim`
- **Method**: GET
- **Description**: Retrieves details for a specific bonus claim
- **Query Parameters**:
  - `userId`: User ID
  - `bonusId`: Bonus ID
- **Response**:
  ```json
  {
    "bonusId": "string",
    "userId": "string",
    "amount": "number",
    "status": "string",
    "timestamp": "string",
    "metadata": {
      "source": "string",
      "campaign": "string"
    }
  }
  ```

## Data Model

### DynamoDB Table Schema

The application uses a single DynamoDB table to store bonus claim records with a composite primary key. This key consists of:
- **Table Name**: Automatically generated based on environment (e.g., `bonus-app-dynamodb-dev-BonusClaimsTableCC7F5416-I2EWPMWGW2I7`)
- **Partition Key (PK)**: `USER#{userId}` - Identifies the user
- **Sort Key (SK)**: `BONUS#{bonusId}` - Identifies the specific bonus

**Additional Attributes**:
- `userId`: User identifier (string)
- `bonusId`: Unique bonus identifier (string)
- `amount`: Bonus amount (number)
- `status`: Status of the bonus claim (PENDING, CLAIMED, etc.)
- `timestamp`: ISO timestamp of creation
- `metadata`: JSON string containing additional contextual data

### Seeded Example Entities

The infrastructure automatically seeds the following examples when deployed:

1. **User 1001, Bonus 001**
   ```json
   {
     "PK": "USER#1001",
     "SK": "BONUS#001",
     "userId": "1001",
     "bonusId": "001",
     "amount": 100,
     "status": "CLAIMED",
     "timestamp": "2023-01-15T12:00:00Z",
     "metadata": "{\"source\":\"referral\",\"campaign\":\"spring2023\"}"
   }
   ```

2. **User 1002, Bonus 002**
   ```json
   {
     "PK": "USER#1002",
     "SK": "BONUS#002",
     "userId": "1002",
     "bonusId": "002",
     "amount": 50,
     "status": "PENDING",
     "timestamp": "2023-02-20T15:30:00Z",
     "metadata": "{\"source\":\"signup\",\"campaign\":\"summer2023\"}"
   }
   ```

3. **User 1003, Bonus 003**
   ```json
   {
     "PK": "USER#1003",
     "SK": "BONUS#003",
     "userId": "1003",
     "bonusId": "003",
     "amount": 75,
     "status": "CLAIMED",
     "timestamp": "2023-03-10T09:15:00Z",
     "metadata": "{\"source\":\"purchase\",\"campaign\":\"winter2023\"}"
   }
   ```

## Infrastructure Management

### Branch Strategy

- **dev branch**: Deploys to development environment
- **main branch**: Deploys to production environment

### Deployment Process

Deployment is fully automated through GitHub Actions:

1. Push to `dev` branch → Deploy to development environment
2. Push to `main` branch → Deploy to production environment
3. Manual deployment via GitHub Actions workflow_dispatch

### Modifying the Infrastructure

1. Clone the repository
2. Create a feature branch from `dev`
3. Make changes to infrastructure code
4. Push to feature branch and create a PR to `dev`
5. After testing in development, create a PR from `dev` to `main` for production deployment

### Pushing to the Dev Branch

To push code to the dev branch and trigger the automated deployment workflow:

```bash
# Check if dev branch exists locally
git branch -a

# If it exists, switch to it
git checkout dev

# If it doesn't exist, create and switch to it
git checkout -b dev

# Make sure your local dev branch is up to date (if it already existed)
git pull origin dev

# Make your changes

# Add your changes
git add .

# Commit your changes
git commit -m "Your commit message"

# Push to the dev branch
git push origin dev
```

## Step-by-Step Deployment Instructions

### Prerequisites

Before you can deploy this application, you need:

1. **AWS Account**: With administrative permissions
2. **GitHub Account**: For repository access and GitHub Actions
3. **GitHub Secrets**: Set up the following repository secrets:
   - `AWS_ACCESS_KEY_ID`: AWS access key for deployment
   - `AWS_SECRET_ACCESS_KEY`: AWS secret key for deployment
   - `AWS_REGION`: Target AWS region (e.g., `us-east-2`)
   - `AWS_ACCOUNT_ID`: Your AWS account ID

### Deployment Steps

#### Option 1: Automatic Deployment via GitHub Actions

1. **Set up GitHub Environments**:
   - Navigate to your repository's Settings > Secrets and variables > Actions
   - Add the required secrets

2. **Deploy to Development**:
   - Push code to the `dev` branch:
     ```bash
     git checkout -b dev
     git push origin dev
     ```
   - GitHub Actions will automatically deploy to the development environment

3. **Deploy to Production**:
   - Merge code from `dev` to `main`:
     ```bash
     git checkout main
     git merge dev
     git push origin main
     ```
   - GitHub Actions will automatically deploy to the production environment


#### Option 2: Manual Local Deployment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/everyrealm.git
   cd everyrealm
   ```

2. **Install dependencies**:
   ```bash
   npm ci --legacy-peer-deps
   ```

3. **Configure AWS credentials**:
   ```bash
   aws configure
   # Enter your AWS Access Key ID, Secret Access Key, and preferred region
   ```

4. **Deploy the stacks**:
   ```bash
   # For development environment
   npx cdk deploy --all --context env=dev

   # For production environment
   npx cdk deploy --all --context env=prod
   ```

5. **Get the ALB URL**:
   ```bash
   # For dev environment
   aws cloudformation describe-stacks --stack-name bonus-app-alb-dev \
     --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerDNS'].OutputValue" \
     --output text

   # For prod environment  
   aws cloudformation describe-stacks --stack-name bonus-app-alb-prod \
     --query "Stacks[0].Outputs[?OutputKey=='LoadBalancerDNS'].OutputValue" \
     --output text
   ```
## Monitoring and Troubleshooting

### Health Checks

Both services expose a `/health` endpoint that returns a 200 OK response when the service is operational.

### CloudWatch Logs

Log groups are created for each service in each environment:
- `/ecs/user-service-dev`
- `/ecs/admin-service-dev` 
- `/ecs/user-service-prod`
- `/ecs/admin-service-prod`

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| API returns 404 | Ensure you're using the correct endpoint URL |
| API returns 500 | Check CloudWatch logs for service errors |
| Deployment fails | Check GitHub Actions logs for details |

## Architecture Decisions and Trade-offs

### Infrastructure Design Decisions

1. **Microservices Architecture**: I've separated user and admin functionality into distinct services to allow independent scaling and deployment. This improves maintainability but adds complexity in service coordination.

2. **VPC Design**: The application uses a multi-AZ VPC with public and private subnets to maximize availability and security:
   - Services run in private subnets for security
   - NAT Gateways in public subnets enable outbound internet access
   - This approach increases cost but provides better security and reliability

3. **CloudFormation Stacks Separation**: I've divided infrastructure into separate stacks:
   - Benefits: Improved isolation, targeted updates, clearer boundaries
   - Trade-offs: More complex dependency management, potential for circular references

4. **DynamoDB as Database Layer**:
   - Benefits: Fully managed, high availability, automatic scaling
   - Trade-offs: Limited complex query capabilities, eventual consistency by default

5. **ECS Fargate vs. Lambda vs. EKS**:
   - We chose ECS Fargate for container orchestration due to:
     - Serverless operation with no cluster management
     - Better support for long-running services than Lambda
     - Simpler management than Kubernetes (EKS)
   - Trade-offs: Less flexibility than EKS, potentially higher cost than Lambda for low traffic

6. **GitHub Actions for CI/CD**:
   - Benefits: Tight integration with GitHub, simpler setup than Jenkins
   - Trade-offs: Less customization than self-hosted solutions

### Security Considerations

1. **Principle of Least Privilege**:
   - User Service: Write-only permissions to create bonus claims
   - Admin Service: Read-only permissions to retrieve bonus claims
   - Task Execution Roles: Minimum permissions for CloudWatch Logs and ECR

2. **Network Security**:
   - Services in private subnets
   - Security groups with minimum required access
   - No direct internet exposure for containers

3. **Environment Isolation**:
   - Complete separation between dev and prod resources
   - Environment-specific IAM roles and policies
   - Separate log groups for each service in each environment

## GitHub Actions Pipeline

### Pipeline Overview

The CI/CD pipeline is defined in `.github/workflows/deploy.yml` and handles:

1. **Environment Detection**:
   - Automatically determines environment based on branch
   - `main` branch → production environment
   - `dev` branch → development environment

2. **Build and Test**:
   - Installs dependencies
   - Runs TypeScript compilation
   - Runs linting and tests
   - Builds Docker container images

3. **Deployment Strategy**:
   - Synthesizes CloudFormation templates
   - Bootstraps CDK environment if needed
   - Deploys stacks in dependency order
   - Handles failures gracefully with clear error messages

### Environment Variables Configuration

The pipeline uses the following GitHub secrets:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key for deployment |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for deployment |
| `AWS_REGION` | Target AWS region |
| `AWS_ACCOUNT_ID` | AWS account ID |

### Pipeline Configuration Example

```yaml
# Simplified example of key parts of the workflow
name: Deploy Bonus App Infrastructure

on:
  push:
    branches: [main, dev]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        default: 'dev'
        type: choice
        options: [dev, prod]

jobs:
  deploy:
    name: Deploy CDK Stacks
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment || (github.ref == 'refs/heads/main' && 'prod' || 'dev') }}
    
    steps:
      # Setup steps omitted for brevity
      
      - name: Deploy CDK Stacks
        env:
          DEPLOYMENT_ENVIRONMENT: ${{ github.event.inputs.environment || (github.ref == 'refs/heads/main' && 'prod' || 'dev') }}
        run: |
          # Set common options
          CDK_OPTIONS="--context env=$DEPLOYMENT_ENVIRONMENT"
          
          # Deploy stacks in dependency order
          npx cdk deploy BonusApp-DynamoDB-$DEPLOYMENT_ENVIRONMENT $CDK_OPTIONS
          npx cdk deploy BonusApp-VPC-$DEPLOYMENT_ENVIRONMENT $CDK_OPTIONS
          # Additional stacks omitted for brevity
```