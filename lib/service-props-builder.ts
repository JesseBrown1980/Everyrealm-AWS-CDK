import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';

/**
 * Builder class for ServiceBaseStackProps to simplify service configuration
 */
export class ServicePropsBuilder {
  private props: {
    cluster?: ecs.Cluster;
    serviceName?: string;
    containerPort?: number;
    memory?: number;
    cpu?: number;
    desiredCount?: number;
    environment?: { [key: string]: string };
    healthCheckPath?: string;
    deploymentEnvironment?: string;
    stackProps?: cdk.StackProps;
  } = {};

  /**
   * Create a builder with default values
   */
  constructor() {
    this.props = {
      memory: 512,
      cpu: 256,
      desiredCount: 2,
      healthCheckPath: '/health',
      environment: {
        NODE_ENV: 'production',
      },
      deploymentEnvironment: 'dev',
    };
  }

  /**
   * Static factory method for user service
   */
  public static forUserService(
    cluster: ecs.Cluster,
    bonusClaimsTable: dynamodb.Table,
    deploymentEnvironment: string,
    stackProps?: cdk.StackProps
  ): ServicePropsBuilder {
    return new ServicePropsBuilder()
      .withCluster(cluster)
      .withServiceName('user-service')
      .withContainerPort(3000)
      .withEnvironment({
        NODE_ENV: 'production',
        PORT: '3000',
        DYNAMODB_TABLE: bonusClaimsTable.tableName,
      })
      .withDeploymentEnvironment(deploymentEnvironment)
      .withStackProps(stackProps);
  }

  /**
   * Static factory method for admin service
   */
  public static forAdminService(
    cluster: ecs.Cluster,
    bonusClaimsTable: dynamodb.Table,
    deploymentEnvironment: string,
    stackProps?: cdk.StackProps
  ): ServicePropsBuilder {
    return new ServicePropsBuilder()
      .withCluster(cluster)
      .withServiceName('admin-service')
      .withContainerPort(3001)
      .withEnvironment({
        NODE_ENV: 'production',
        PORT: '3001',
        DYNAMODB_TABLE: bonusClaimsTable.tableName,
      })
      .withDeploymentEnvironment(deploymentEnvironment)
      .withStackProps(stackProps);
  }

  // Builder methods
  public withCluster(cluster: ecs.Cluster): ServicePropsBuilder {
    this.props.cluster = cluster;
    return this;
  }

  public withServiceName(serviceName: string): ServicePropsBuilder {
    this.props.serviceName = serviceName;
    return this;
  }

  public withContainerPort(containerPort: number): ServicePropsBuilder {
    this.props.containerPort = containerPort;
    return this;
  }

  public withMemory(memory: number): ServicePropsBuilder {
    this.props.memory = memory;
    return this;
  }

  public withCpu(cpu: number): ServicePropsBuilder {
    this.props.cpu = cpu;
    return this;
  }

  public withDesiredCount(desiredCount: number): ServicePropsBuilder {
    this.props.desiredCount = desiredCount;
    return this;
  }

  public withEnvironment(environment: { [key: string]: string }): ServicePropsBuilder {
    this.props.environment = { ...this.props.environment, ...environment };
    return this;
  }

  public withHealthCheckPath(healthCheckPath: string): ServicePropsBuilder {
    this.props.healthCheckPath = healthCheckPath;
    return this;
  }

  public withDeploymentEnvironment(deploymentEnvironment: string): ServicePropsBuilder {
    this.props.deploymentEnvironment = deploymentEnvironment;
    return this;
  }

  public withStackProps(stackProps?: cdk.StackProps): ServicePropsBuilder {
    this.props.stackProps = stackProps;
    return this;
  }

  /**
   * Build the final props object
   */
  public build(): any {
    // Validate required properties
    if (!this.props.cluster) throw new Error('Cluster is required');
    if (!this.props.serviceName) throw new Error('Service name is required');
    if (!this.props.containerPort) throw new Error('Container port is required');
    if (!this.props.deploymentEnvironment) throw new Error('Deployment environment is required');

    return {
      ...this.props.stackProps,
      cluster: this.props.cluster,
      serviceName: this.props.serviceName,
      containerPort: this.props.containerPort,
      memory: this.props.memory,
      cpu: this.props.cpu,
      desiredCount: this.props.desiredCount,
      environment: this.props.environment,
      healthCheckPath: this.props.healthCheckPath,
      deploymentEnvironment: this.props.deploymentEnvironment,
    };
  }
}
