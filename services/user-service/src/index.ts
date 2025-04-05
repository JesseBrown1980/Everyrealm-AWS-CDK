import express from 'express';
import bodyParser from 'body-parser';
import * as AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid';

/**
 * User Service - Handles bonus claim creation for users
 *
 * Endpoints:
 * - GET /health - Health check endpoint
 * - GET /user-service/health - Additional health check endpoint for ALB path-based routing
 * - POST /add-bonus-claim - Create a new bonus claim
 */

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Configure AWS SDK with just the region
const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-2',
});

// Check for required env vars
if (!process.env.DYNAMODB_TABLE) {
  console.error('ERROR: DYNAMODB_TABLE environment variable is required');
  process.exit(1); // Exit with error if required env var is missing
}

/**
 * Health check endpoint
 * Used by load balancer to verify service health
 */
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/**
 * Add a new bonus claim
 *
 * @route POST /add-bonus-claim
 * @param {object} req.body - Request body
 * @param {string} req.body.userId - User ID
 * @param {number} req.body.amount - Bonus amount
 * @param {string} [req.body.source] - Source of the bonus (e.g., 'referral')
 * @param {string} [req.body.campaign] - Campaign identifier
 * @returns {object} Created bonus claim
 * @throws {400} If request body is invalid
 * @throws {500} If server error occurs
 */
app.post('/add-bonus-claim', async (req, res) => {
  try {
    // Validate request body
    const { userId, amount, source, campaign } = req.body;

    if (!userId || !amount || isNaN(Number(amount))) {
      return res.status(400).json({
        error: 'Invalid request. Required fields: userId, amount (number)',
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0',
      });
    }

    // Validate environment variables
    const tableName = process.env.DYNAMODB_TABLE;
    if (!tableName) {
      throw new Error('DYNAMODB_TABLE environment variable is not set');
    }

    // Generate a bonus ID
    const bonusId = uuid().substring(0, 8);
    const timestamp = new Date().toISOString();

    // Create DynamoDB item
    const item = {
      PK: `USER#${userId}`,
      SK: `BONUS#${bonusId}`,
      userId,
      bonusId,
      amount: Number(amount),
      status: 'PENDING',
      timestamp,
      metadata: JSON.stringify({
        source: source || 'api',
        campaign: campaign || 'default',
      }),
    };

    console.log(`Creating bonus claim for user ${userId} with amount ${amount}`);

    // Save to DynamoDB
    await dynamoDB
      .put({
        TableName: tableName,
        Item: item,
      })
      .promise();

    console.log(`Successfully created bonus claim with ID ${bonusId}`);

    // Return the created bonus claim
    return res.status(201).json({
      bonusId,
      userId,
      amount: Number(amount),
      status: 'PENDING',
      timestamp,
      metadata: {
        source: source || 'api',
        campaign: campaign || 'default',
      },
    });
  } catch (error) {
    console.error('Error adding bonus claim:', error);
    return res.status(500).json({
      error: 'Failed to add bonus claim',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`User service running on port ${port}`);
  console.log(`DynamoDB Table: ${process.env.DYNAMODB_TABLE}`);
});
