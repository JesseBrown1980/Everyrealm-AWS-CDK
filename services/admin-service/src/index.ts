import express from 'express';
import bodyParser from 'body-parser';
import * as AWS from 'aws-sdk';

/**
 * Admin Service - Handles administrative operations for bonus claims
 *
 * Endpoints:
 * - GET /health - Health check endpoint
 * - GET /get-bonus-claim - Retrieve a bonus claim by user ID and bonus ID
 */

const app = express();
const port = process.env.PORT || 3001;

app.use(bodyParser.json());

// Configure AWS SDK with just the region
const dynamoDB = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-2',
});

if (!process.env.DYNAMODB_TABLE) {
  console.error('ERROR: DYNAMODB_TABLE environment variable is required');
  process.exit(1);
}

/**
 * Health check endpoint
 * Used by load balancer to verify service health
 */
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

/**
 * Get a bonus claim by user ID and bonus ID
 *
 * @route GET /get-bonus-claim
 * @param {string} req.query.userId - User ID
 * @param {string} req.query.bonusId - Bonus ID
 * @returns {object} Bonus claim details
 * @throws {400} If required parameters are missing
 * @throws {404} If bonus claim not found
 * @throws {500} If server error occurs
 */
app.get('/get-bonus-claim', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const bonusId = req.query.bonusId as string;

    if (!userId || !bonusId) {
      return res.status(400).json({
        error: 'Missing required parameters: userId and bonusId are required',
      });
    }

    const tableName = process.env.DYNAMODB_TABLE;
    if (!tableName) {
      throw new Error('DYNAMODB_TABLE environment variable is not set');
    }

    const key = {
      PK: `USER#${userId}`,
      SK: `BONUS#${bonusId}`,
    };

    const result = await dynamoDB
      .get({
        TableName: tableName,
        Key: key,
      })
      .promise();

    if (!result.Item) {
      return res.status(404).json({ error: 'Bonus claim not found' });
    }

    const item = result.Item;
    let metadata = {};
    try {
      metadata = item.metadata ? JSON.parse(item.metadata as string) : {};
    } catch (parseError) {
      console.warn('Error parsing metadata JSON:', parseError);
    }

    return res.status(200).json({
      bonusId: item.bonusId,
      userId: item.userId,
      amount: item.amount,
      status: item.status,
      timestamp: item.timestamp,
      metadata,
    });
  } catch (error) {
    console.error('Error retrieving bonus claim:', error);
    return res.status(500).json({
      error: 'Failed to retrieve bonus claim',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Admin service running on port ${port}`);
  console.log(`DynamoDB Table: ${process.env.DYNAMODB_TABLE}`);
});
