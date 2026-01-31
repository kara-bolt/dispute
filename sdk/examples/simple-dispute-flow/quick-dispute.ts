/**
 * Quick Dispute - One-liner dispute creation
 * 
 * The simplest possible dispute creation for agents.
 * 
 * Usage:
 *   PRIVATE_KEY=0x... npx tsx quick-dispute.ts
 */

import { DisputeFlow } from '@kara/dispute-sdk';
import { parseEther } from 'viem';

async function main() {
  // Initialize with private key
  const flow = new DisputeFlow({
    chain: 'base-sepolia', // Use testnet
    privateKey: process.env.PRIVATE_KEY as `0x${string}`,
  });

  console.log(`Agent address: ${flow.address}`);

  // One-liner dispute creation
  const { disputeId, txHash, votingDeadline } = await flow.createDispute({
    against: '0x1234567890123456789012345678901234567890',
    amount: parseEther('0.1'),
    reason: 'service_not_delivered',
    description: 'Provider agent did not complete the agreed data analysis task',
  });

  console.log(`
✅ Dispute Created!
   ID: ${disputeId}
   TX: ${txHash}
   Voting ends: ${votingDeadline.toISOString()}
  `);
}

main().catch(console.error);
