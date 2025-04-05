#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { DynamoDBStack } from '../lib/dynamodb-stack';
import { EcsClusterStack } from '../lib/ecs-cluster-stack';
import { UserServiceStack } from '../lib/user-service-stack';
import { AdminServiceStack } from '../lib/admin-service-stack';
import { AlbStack } from '../lib/alb-stack';
import { loadConfig } from '../lib/config';

const app = new cdk.App();
const config = loadConfig();

const contextOverrides = {
  env: app.node.tryGetContext('env'),
  domainName: app.node.tryGetContext('domainName'),
  hostedZoneId: app.node.tryGetContext('hostedZoneId'),
  certificateArn: app.node.tryGetContext('certificateArn'),
};

if (contextOverrides.env) config.environment = contextOverrides.env;
if (contextOverrides.domainName) config.domainName = contextOverrides.domainName;
if (contextOverrides.hostedZoneId) config.hostedZoneId = contextOverrides.hostedZoneId;
if (contextOverrides.certificateArn) config.certificateArn = contextOverrides.certificateArn;

console.log(
  `Deploying to: ${config.environment} | Account: ${config.env.account} | Region: ${config.env.region}`
);
if (config.domainName) console.log(`Domain: ${config.domainName}`);

cdk.Aspects.of(app).add(new cdk.Tag('Environment', config.environment));

const vpcStack = new VpcStack(app, `BonusApp-VPC-${config.environment}`, {
  env: config.env,
  description: 'VPC for the Bonus Application',
  stackName: `bonus-app-vpc-${config.environment}`,
});

const dynamoDbStack = new DynamoDBStack(app, `BonusApp-DynamoDB-${config.environment}`, {
  env: config.env,
  description: 'DynamoDB tables for the Bonus Application',
  stackName: `bonus-app-dynamodb-${config.environment}`,
  pointInTimeRecovery: config.dynamoDb.pointInTimeRecovery,
  removalPolicy:
    config.dynamoDb.removalPolicy === 'RETAIN'
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY,
  deploymentEnvironment: config.environment,
  useStaticTableName: false,
  config,
});

const ecsClusterStack = new EcsClusterStack(app, `BonusApp-ECS-Cluster-${config.environment}`, {
  env: config.env,
  description: `ECS Cluster Stack for ${config.environment} environment`,
  stackName: `BonusApp-ECS-Cluster-${config.environment}`,
  vpc: vpcStack.vpc,
  stackNamePrefix: 'BonusApp',
  environment: config.environment,
});

const userServiceStack = new UserServiceStack(app, `BonusApp-UserService-${config.environment}`, {
  env: config.env,
  description: 'User Service for the Bonus Application',
  stackName: `bonus-app-user-service-${config.environment}`,
  cluster: ecsClusterStack.cluster,
  bonusClaimsTable: dynamoDbStack.bonusClaimsTable,
  desiredCount: config.services.userService.desiredCount,
  deploymentEnvironment: config.environment,
});

const adminServiceStack = new AdminServiceStack(
  app,
  `BonusApp-AdminService-${config.environment}`,
  {
    env: config.env,
    description: 'Admin Service for the Bonus Application',
    stackName: `bonus-app-admin-service-${config.environment}`,
    cluster: ecsClusterStack.cluster,
    bonusClaimsTable: dynamoDbStack.bonusClaimsTable,
    desiredCount: config.services.adminService.desiredCount,
    deploymentEnvironment: config.environment,
  }
);

const albStack = new AlbStack(app, `BonusApp-ALB-${config.environment}`, {
  env: config.env,
  description: 'Application Load Balancer for the Bonus Application',
  stackName: `bonus-app-alb-${config.environment}`,
  vpc: vpcStack.vpc,
  userService: userServiceStack.service,
  adminService: adminServiceStack.service,
  userServicePort: 3000,
  adminServicePort: 3001,
  domainName: config.domainName,
  hostedZoneId: config.hostedZoneId,
  certificateArn: config.certificateArn,
});

userServiceStack.addDependency(ecsClusterStack);
userServiceStack.addDependency(dynamoDbStack);
adminServiceStack.addDependency(ecsClusterStack);
adminServiceStack.addDependency(dynamoDbStack);
ecsClusterStack.addDependency(vpcStack);
albStack.addDependency(vpcStack);

app.synth();
