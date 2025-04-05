import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Try to load .env file if it exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  console.log('Loading environment variables from .env file');
  dotenv.config({ path: envPath });
}

// Environment configuration
export interface AppConfig {
  env: {
    account: string;
    region: string;
  };
  environment: string;
  domainName?: string;
  hostedZoneId?: string;
  certificateArn?: string;
  services: {
    userService: {
      desiredCount: number;
    };
    adminService: {
      desiredCount: number;
    };
  };
  dynamoDb: {
    pointInTimeRecovery: boolean;
    removalPolicy: 'DESTROY' | 'RETAIN';
  };
}

// Add this function to validate configuration
function validateConfig(config: AppConfig): void {
  // Basic validation
  if (!config.env.region) {
    throw new Error('AWS_REGION is required');
  }

  if (!config.env.account) {
    throw new Error('AWS_ACCOUNT_ID is required');
  }

  // Validate service configuration
  if (config.services.userService.desiredCount < 1) {
    throw new Error('USER_SERVICE_DESIRED_COUNT must be at least 1');
  }

  if (config.services.adminService.desiredCount < 1) {
    throw new Error('ADMIN_SERVICE_DESIRED_COUNT must be at least 1');
  }

  // Validate for failover scenarios
  const environment = process.env.CDK_ENV || 'dev';
  const isProd = environment === 'prod';

  // For production, validate higher redundancy settings
  if (isProd) {
    // In production, enforce minimum of 2 instances for high availability
    if (config.services.userService.desiredCount < 2) {
      throw new Error(
        'USER_SERVICE_DESIRED_COUNT must be at least 2 in production for high availability'
      );
    }

    if (config.services.adminService.desiredCount < 2) {
      throw new Error(
        'ADMIN_SERVICE_DESIRED_COUNT must be at least 2 in production for high availability'
      );
    }

    // Validate the correct removal policy for production
    if (config.dynamoDb.removalPolicy !== 'RETAIN') {
      console.warn('WARNING: DynamoDB table removal policy should be RETAIN in production.');
    }

    // Ensure point-in-time recovery is enabled for production
    if (!config.dynamoDb.pointInTimeRecovery) {
      throw new Error(
        'DYNAMODB_POINT_IN_TIME_RECOVERY must be enabled in production for data recovery'
      );
    }
  }

  // Validate if domain configuration is provided but incomplete
  if (config.domainName && !config.hostedZoneId) {
    throw new Error(
      'When DOMAIN_NAME is provided, HOSTED_ZONE_ID is required for DNS configuration'
    );
  }

  if (config.hostedZoneId && !config.domainName) {
    throw new Error(
      'When HOSTED_ZONE_ID is provided, DOMAIN_NAME is required for DNS configuration'
    );
  }
}

// Parse environment variables with appropriate defaults
export function loadConfig(): AppConfig {
  const environment = process.env.CDK_ENV || 'dev';
  const isProd = environment === 'prod';

  const config = {
    env: {
      account: process.env.AWS_ACCOUNT_ID || '',
      region: process.env.AWS_REGION || 'us-east-2',
    },
    environment,
    domainName: process.env.DOMAIN_NAME,
    hostedZoneId: process.env.HOSTED_ZONE_ID,
    certificateArn: process.env.CERTIFICATE_ARN,
    services: {
      userService: {
        desiredCount: parseInt(process.env.USER_SERVICE_DESIRED_COUNT || (isProd ? '2' : '1')),
      },
      adminService: {
        desiredCount: parseInt(process.env.ADMIN_SERVICE_DESIRED_COUNT || (isProd ? '2' : '1')),
      },
    },
    dynamoDb: {
      pointInTimeRecovery: process.env.DYNAMODB_POINT_IN_TIME_RECOVERY === 'false' ? false : true,
      removalPolicy: (process.env.DYNAMODB_REMOVAL_POLICY === 'RETAIN' || isProd
        ? 'RETAIN'
        : 'DESTROY') as 'DESTROY' | 'RETAIN',
    },
  };

  validateConfig(config);
  return config;
}
