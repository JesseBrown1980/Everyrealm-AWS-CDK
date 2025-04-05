import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { AppConfig } from './config';
import { generateSeedData } from './seed-data';

export interface DynamoDBStackProps extends cdk.StackProps {
  pointInTimeRecovery?: boolean;
  removalPolicy?: cdk.RemovalPolicy;
  deploymentEnvironment?: string;
  useStaticTableName?: boolean;
  config: AppConfig;
}

export class DynamoDBStack extends cdk.Stack {
  public readonly bonusClaimsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DynamoDBStackProps) {
    super(scope, id, props);

    // Create DynamoDB table with conditional naming
    const tableProps: Omit<dynamodb.TableProps, 'tableName'> = {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: props.removalPolicy || cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled:
          props.pointInTimeRecovery !== undefined ? props.pointInTimeRecovery : true,
      },
    };

    // Create table with or without static name
    this.bonusClaimsTable = props.useStaticTableName
      ? new dynamodb.Table(this, 'BonusClaimsTable', {
          ...tableProps,
          tableName: `bonus-claims-${props.deploymentEnvironment || props.config.environment}`,
        })
      : new dynamodb.Table(this, 'BonusClaimsTable', tableProps);

    // Add GSI for querying by timestamp
    this.bonusClaimsTable.addGlobalSecondaryIndex({
      indexName: 'TimestampIndex',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    // Seed data using custom resource
    const seedDataRole = new iam.Role(this, 'SeedDataRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    seedDataRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
    );

    seedDataRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:BatchWriteItem', 'dynamodb:PutItem', 'dynamodb:DescribeTable'],
        resources: [this.bonusClaimsTable.tableArn],
      })
    );

    // Get seed data from the separate module
    const seedData = generateSeedData();

    // Create custom resource to seed data
    new cr.AwsCustomResource(this, 'SeedBonusClaimsData', {
      onCreate: {
        service: 'DynamoDB',
        action: 'batchWriteItem',
        parameters: {
          RequestItems: {
            [this.bonusClaimsTable.tableName]: seedData,
          },
        },
        physicalResourceId: cr.PhysicalResourceId.of(Date.now().toString()), // Use timestamp to force update
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['dynamodb:BatchWriteItem', 'dynamodb:PutItem', 'dynamodb:DescribeTable'],
          resources: [this.bonusClaimsTable.tableArn],
        }),
      ]),
      role: seedDataRole,
    });

    // Add outputs
    new cdk.CfnOutput(this, 'BonusClaimsTableName', {
      value: this.bonusClaimsTable.tableName,
      description: 'The name of the DynamoDB table for bonus claims',
      exportName: `${this.stackName}-BonusClaimsTableName`,
    });

    new cdk.CfnOutput(this, 'BonusClaimsTableArn', {
      value: this.bonusClaimsTable.tableArn,
      description: 'The ARN of the DynamoDB table for bonus claims',
      exportName: `${this.stackName}-BonusClaimsTableArn`,
    });
  }
}
