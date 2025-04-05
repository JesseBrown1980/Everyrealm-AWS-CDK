// Define interfaces for DynamoDB records
export interface BonusClaimRecord {
  PK: string; // Partition key - USER#{USER_ID}
  SK: string; // Sort key - BONUS#{BONUS_ID}
  userId: string;
  bonusId: string;
  amount: number;
  status: 'PENDING' | 'CLAIMED' | 'EXPIRED';
  timestamp: string;
  metadata: string;
}

/**
 * Generate seed data for the DynamoDB tables
 * @returns An array of DynamoDB formatted items for batch writing
 */
export function generateSeedData() {
  // Create timestamps with different dates for better demonstration
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(now.getDate() - 7);
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);

  return [
    [
      {
        PutRequest: {
          Item: {
            PK: { S: 'USER#1001' },
            SK: { S: 'BONUS#001' },
            userId: { S: '1001' },
            bonusId: { S: '001' },
            amount: { N: '100' },
            status: { S: 'CLAIMED' },
            timestamp: { S: oneMonthAgo.toISOString() },
            metadata: { S: JSON.stringify({ source: 'referral', campaign: 'spring2023' }) },
          },
        },
      },
      {
        PutRequest: {
          Item: {
            PK: { S: 'USER#1002' },
            SK: { S: 'BONUS#002' },
            userId: { S: '1002' },
            bonusId: { S: '002' },
            amount: { N: '50' },
            status: { S: 'PENDING' },
            timestamp: { S: oneWeekAgo.toISOString() },
            metadata: { S: JSON.stringify({ source: 'signup', campaign: 'summer2023' }) },
          },
        },
      },
      {
        PutRequest: {
          Item: {
            PK: { S: 'USER#1003' },
            SK: { S: 'BONUS#003' },
            userId: { S: '1003' },
            bonusId: { S: '003' },
            amount: { N: '75' },
            status: { S: 'CLAIMED' },
            timestamp: { S: now.toISOString() },
            metadata: { S: JSON.stringify({ source: 'purchase', campaign: 'winter2023' }) },
          },
        },
      },
    ],
  ];
}
