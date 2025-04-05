import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

export interface EcsClusterStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  stackNamePrefix: string;
  environment: string;
}

export class EcsClusterStack extends cdk.Stack {
  public readonly cluster: ecs.Cluster;

  constructor(scope: Construct, id: string, props: EcsClusterStackProps) {
    super(scope, id, props);

    // Create ECS Cluster
    this.cluster = new ecs.Cluster(this, 'BonusAppCluster', {
      vpc: props.vpc,
      clusterName: `${props.stackNamePrefix}-cluster-${props.environment}`,
      containerInsights: true,
    });

    // Add outputs
    new cdk.CfnOutput(this, 'ClusterName', {
      value: this.cluster.clusterName,
      description: 'The name of the ECS cluster',
      exportName: `${this.stackName}-ClusterName`,
    });

    new cdk.CfnOutput(this, 'ClusterArn', {
      value: this.cluster.clusterArn,
      description: 'The ARN of the ECS cluster',
      exportName: `${this.stackName}-ClusterArn`,
    });
  }
}
