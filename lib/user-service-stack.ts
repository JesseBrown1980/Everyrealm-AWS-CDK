import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';
import { ServiceBaseStack } from './service-base-stack';
import { ServicePropsBuilder } from './service-props-builder';

export interface UserServiceStackProps extends cdk.StackProps {
  cluster: ecs.Cluster;
  bonusClaimsTable: dynamodb.Table;
  desiredCount?: number;
  deploymentEnvironment?: string;
}

export class UserServiceStack extends ServiceBaseStack {
  constructor(scope: Construct, id: string, props: UserServiceStackProps) {
    // Use the builder pattern to create stack props
    const serviceProps = ServicePropsBuilder.forUserService(
      props.cluster,
      props.bonusClaimsTable,
      props.deploymentEnvironment || 'dev',
      props
    )
      .withDesiredCount(props.desiredCount || 2)
      .build();

    super(scope, id, serviceProps);

    // Grant the task role permission to write to DynamoDB
    props.bonusClaimsTable.grantWriteData(this.taskDefinition.taskRole);

    // Add outputs
    new cdk.CfnOutput(this, 'UserServiceTaskDefinitionArn', {
      value: this.taskDefinition.taskDefinitionArn,
      description: 'The ARN of the user service task definition',
      exportName: `${this.stackName}-UserServiceTaskDefArn`,
    });

    new cdk.CfnOutput(this, 'UserServiceName', {
      value: this.service.serviceName,
      description: 'The name of the user service',
      exportName: `${this.stackName}-UserServiceName`,
    });
  }
}
