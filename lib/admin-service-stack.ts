import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
import { ServiceBaseStack } from './service-base-stack';
import { ServicePropsBuilder } from './service-props-builder';

export interface AdminServiceStackProps extends cdk.StackProps {
  cluster: ecs.Cluster;
  bonusClaimsTable: dynamodb.Table;
  desiredCount?: number;
  deploymentEnvironment?: string;
}

export class AdminServiceStack extends ServiceBaseStack {
  constructor(scope: Construct, id: string, props: AdminServiceStackProps) {
    // Use the builder pattern to create stack props
    const serviceProps = ServicePropsBuilder.forAdminService(
      props.cluster,
      props.bonusClaimsTable,
      props.deploymentEnvironment || 'dev',
      props
    )
      .withDesiredCount(props.desiredCount || 2)
      .build();

    super(scope, id, serviceProps);

    // Grant the task role permission to read from DynamoDB
    props.bonusClaimsTable.grantReadData(this.taskDefinition.taskRole);

    // Add outputs
    new cdk.CfnOutput(this, 'AdminServiceTaskDefinitionArn', {
      value: this.taskDefinition.taskDefinitionArn,
      description: 'The ARN of the admin service task definition',
      exportName: `${this.stackName}-AdminServiceTaskDefArn`,
    });

    new cdk.CfnOutput(this, 'AdminServiceName', {
      value: this.service.serviceName,
      description: 'The name of the admin service',
      exportName: `${this.stackName}-AdminServiceName`,
    });
  }
}
