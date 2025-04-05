import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { Construct } from 'constructs';

export interface ServiceBaseStackProps extends cdk.StackProps {
  cluster: ecs.Cluster;
  serviceName: string;
  containerPort: number;
  memory: number;
  cpu: number;
  desiredCount: number;
  environment?: { [key: string]: string };
  healthCheckPath?: string;
  deploymentEnvironment: string;
}

export abstract class ServiceBaseStack extends cdk.Stack {
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly container: ecs.ContainerDefinition;
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: ServiceBaseStackProps) {
    super(scope, id, props);

    // Create log group for service
    const logGroup = new logs.LogGroup(this, `${props.serviceName}LogGroup`, {
      logGroupName: `/ecs/${props.serviceName}-${props.deploymentEnvironment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create task execution role
    const executionRole = new iam.Role(this, `${props.serviceName}TaskExecutionRole`, {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
      ],
    });

    // Add CloudWatch Logs permissions
    executionRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [logGroup.logGroupArn],
      })
    );

    // Create task role
    const taskRole = new iam.Role(this, `${props.serviceName}TaskRole`, {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Create task definition
    this.taskDefinition = new ecs.FargateTaskDefinition(this, `${props.serviceName}TaskDef`, {
      memoryLimitMiB: props.memory,
      cpu: props.cpu,
      executionRole,
      taskRole,
    });

    // Create container definition
    this.container = this.taskDefinition.addContainer(`${props.serviceName}Container`, {
      image: ecs.ContainerImage.fromAsset(
        path.join(__dirname, '..', 'services', props.serviceName)
      ),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: props.serviceName,
        logGroup,
      }),
      environment: props.environment || {},
      healthCheck: props.healthCheckPath
        ? {
            command: [
              'CMD-SHELL',
              `wget --no-verbose --tries=1 --spider http://localhost:${props.containerPort}${props.healthCheckPath} || exit 1`,
            ],
            interval: cdk.Duration.seconds(30),
            timeout: cdk.Duration.seconds(5),
            retries: 3,
            startPeriod: cdk.Duration.seconds(60),
          }
        : undefined,
      essential: true,
    });

    // Add port mapping
    this.container.addPortMappings({
      containerPort: props.containerPort,
      hostPort: props.containerPort,
      protocol: ecs.Protocol.TCP,
    });

    // Create security group for the service
    const securityGroup = new ec2.SecurityGroup(this, `${props.serviceName}ServiceSG`, {
      vpc: props.cluster.vpc,
      description: `Security group for the ${props.serviceName} service`,
      allowAllOutbound: true,
    });

    // Allow inbound traffic on the container port
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(props.containerPort),
      `Allow inbound traffic to ${props.serviceName} on port ${props.containerPort}`
    );

    // Create the Fargate service
    this.service = new ecs.FargateService(this, `${props.serviceName}Service`, {
      cluster: props.cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: props.desiredCount,
      securityGroups: [securityGroup],
      assignPublicIp: false, // Private subnets since we'll use an ALB
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true },
      capacityProviderStrategies: [
        {
          capacityProvider: 'FARGATE_SPOT',
          weight: 1,
          base: 0,
        },
        {
          capacityProvider: 'FARGATE',
          weight: 3,
          base: 1,
        },
      ],
    });

    // Create an auto scaling target for the service
    const scalableTarget = this.service.autoScaleTaskCount({
      minCapacity: Math.max(1, Math.floor(props.desiredCount / 2)),
      maxCapacity: props.desiredCount * 2,
    });

    // Add CPU utilization scaling policy
    scalableTarget.scaleOnCpuUtilization(`${props.serviceName}CpuScaling`, {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Add memory utilization scaling policy
    scalableTarget.scaleOnMemoryUtilization(`${props.serviceName}MemoryScaling`, {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });
  }
}
