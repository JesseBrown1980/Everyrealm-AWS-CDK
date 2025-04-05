import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';

export interface AlbStackProps extends cdk.StackProps {
  vpc: ec2.Vpc;
  userService: ecs.FargateService;
  adminService: ecs.FargateService;
  userServicePort: number;
  adminServicePort: number;
  domainName?: string;
  hostedZoneId?: string;
  certificateArn?: string;
}

export class AlbStack extends cdk.Stack {
  public readonly loadBalancer: elbv2.ApplicationLoadBalancer;
  public readonly userTargetGroup: elbv2.ApplicationTargetGroup;
  public readonly adminTargetGroup: elbv2.ApplicationTargetGroup;

  constructor(scope: Construct, id: string, props: AlbStackProps) {
    super(scope, id, props);

    // Create security group for the ALB
    const albSg = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: props.vpc,
      description: 'Security group for the ALB',
      allowAllOutbound: true,
    });

    // Allow HTTP and HTTPS inbound traffic from anywhere
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS traffic');

    // Create ALB
    this.loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'BonusAppAlb', {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: albSg,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      deletionProtection: false, // Set to true for production
      idleTimeout: cdk.Duration.seconds(60),
    });

    // Create target groups for the services without initially attaching the services
    this.userTargetGroup = new elbv2.ApplicationTargetGroup(this, 'UserServiceTargetGroup', {
      vpc: props.vpc,
      port: props.userServicePort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyHttpCodes: '200',
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    this.adminTargetGroup = new elbv2.ApplicationTargetGroup(this, 'AdminServiceTargetGroup', {
      vpc: props.vpc,
      port: props.adminServicePort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyHttpCodes: '200',
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
      deregistrationDelay: cdk.Duration.seconds(30),
    });

    // Attach the services to the target groups after they've been created
    // This approach helps avoid circular dependencies
    if (props.userService) {
      this.userTargetGroup.addTarget(props.userService);
    }

    if (props.adminService) {
      this.adminTargetGroup.addTarget(props.adminService);
    }

    // Create listeners based on certificate availability
    let httpsListener: elbv2.ApplicationListener | undefined;

    // Create HTTP listener (will redirect to HTTPS if certificate is provided)
    const httpListener = this.loadBalancer.addListener('HttpListener', {
      port: 80,
      open: true,
      defaultAction: props.certificateArn
        ? elbv2.ListenerAction.redirect({
            protocol: 'HTTPS',
            port: '443',
            permanent: true,
          })
        : elbv2.ListenerAction.fixedResponse(404, {
            contentType: 'text/plain',
            messageBody: 'Not Found',
          }),
    });

    if (props.certificateArn) {
      // Create HTTPS listener with the certificate
      const certificate = acm.Certificate.fromCertificateArn(
        this,
        'Certificate',
        props.certificateArn
      );

      httpsListener = this.loadBalancer.addListener('HttpsListener', {
        port: 443,
        certificates: [certificate],
        sslPolicy: elbv2.SslPolicy.RECOMMENDED,
        open: true,
        defaultAction: elbv2.ListenerAction.fixedResponse(404, {
          contentType: 'text/plain',
          messageBody: 'Not Found',
        }),
      });
    }

    // Use the appropriate listener for adding rules
    const primaryListener = httpsListener || httpListener;

    // Add routing rules for the services
    primaryListener.addAction('UserServiceHealthRoute', {
      priority: 5,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/health'])],
      action: elbv2.ListenerAction.forward([this.userTargetGroup]),
    });

    primaryListener.addAction('UserServiceRoute', {
      priority: 10,
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/add-bonus-claim', '/add-bonus-claim/*']),
      ],
      action: elbv2.ListenerAction.forward([this.userTargetGroup]),
    });

    primaryListener.addAction('AdminServiceHealthRoute', {
      priority: 15,
      conditions: [elbv2.ListenerCondition.pathPatterns(['/health'])],
      action: elbv2.ListenerAction.forward([this.adminTargetGroup]),
    });

    primaryListener.addAction('AdminServiceRoute', {
      priority: 20,
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/get-bonus-claim', '/get-bonus-claim/*']),
      ],
      action: elbv2.ListenerAction.forward([this.adminTargetGroup]),
    });

    // Create a Route53 record if a domain is provided
    if (props.domainName && props.hostedZoneId) {
      const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.domainName,
      });

      new route53.ARecord(this, 'AlbAliasRecord', {
        zone,
        recordName: props.domainName,
        target: route53.RecordTarget.fromAlias(
          new route53targets.LoadBalancerTarget(this.loadBalancer)
        ),
        ttl: cdk.Duration.minutes(5),
      });
    }

    // Add outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: this.loadBalancer.loadBalancerDnsName,
      description: 'The DNS name of the load balancer',
      exportName: `${this.stackName}-LoadBalancerDNS`,
    });

    if (props.domainName) {
      new cdk.CfnOutput(this, 'ApplicationURL', {
        value: `https://${props.domainName}`,
        description: 'The URL of the application',
        exportName: `${this.stackName}-ApplicationURL`,
      });
    }
  }
}
