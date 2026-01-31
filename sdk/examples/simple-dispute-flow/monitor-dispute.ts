/**
 * Monitor Dispute Status
 * 
 * Shows how to:
 * 1. Get dispute details by ID
 * 2. Check vote status
 * 3. Poll until resolution
 * 4. Execute ruling if you won
 * 
 * Use case: Track disputes you've created or are involved in.
 */

import { 
  createReadOnlyClient, 
  createWriteClient, 
  statusToString,
  rulingToString,
  pollUntilResolved,
  log,
  formatEther,
  CONFIG,
} from './utils';
import { DisputeStatus } from '@kara/dispute-sdk';

// ============ Main Flow ============

async function monitorDisputeFlow(disputeId: bigint): Promise<void> {
  log('=== Monitor Dispute Flow ===');
  log(`Dispute ID: ${disputeId}`);
  
  const client = createReadOnlyClient();
  
  // Step 1: Get dispute details
  log('Fetching dispute...');
  
  let dispute;
  try {
    dispute = await client.getDispute(disputeId);
  } catch (error) {
    log('Error: Dispute not found or invalid ID');
    return;
  }
  
  log('Dispute details:', {
    id: dispute.id.toString(),
    claimant: dispute.claimant,
    respondent: dispute.respondent,
    amount: formatEther(dispute.amount) + ' ETH',
    status: statusToString(dispute.status),
    ruling: rulingToString(dispute.ruling),
    appealRound: dispute.appealRound,
    createdAt: new Date(Number(dispute.createdAt) * 1000).toISOString(),
    votingDeadline: new Date(Number(dispute.votingDeadline) * 1000).toISOString(),
  });
  
  // Step 2: Check if already resolved
  if (dispute.status === DisputeStatus.Resolved) {
    log('Dispute is already resolved!');
    log(`Ruling: ${rulingToString(dispute.ruling)}`);
    return;
  }
  
  // Step 3: Get vote status
  log('Checking votes...');
  const votes = await client.getVoteResult(disputeId);
  log('Vote tally:', {
    forClaimant: votes.forClaimant.toString(),
    forRespondent: votes.forRespondent.toString(),
    abstained: votes.abstained.toString(),
    totalVoters: votes.agentIds.length,
  });
  
  // Step 4: Get current ruling (may change with more votes)
  const ruling = await client.getCurrentRuling(disputeId);
  log('Current ruling:', {
    ruling: rulingToString(Number(ruling.ruling)),
    tied: ruling.tied,
    canResolve: ruling.resolved,
  });
  
  // Step 5: Time remaining
  const now = BigInt(Math.floor(Date.now() / 1000));
  const deadline = dispute.votingDeadline;
  
  if (deadline > now) {
    const remaining = deadline - now;
    const hours = Number(remaining) / 3600;
    log(`Time remaining: ${hours.toFixed(1)} hours`);
  } else {
    log('Voting deadline has passed');
  }
  
  // Step 6: Poll for resolution (optional)
  const shouldPoll = process.argv.includes('--poll');
  
  if (shouldPoll) {
    log('Polling for resolution...');
    const result = await pollUntilResolved(client, disputeId, {
      maxAttempts: 60,
      intervalMs: 60_000, // 1 minute
      onStatus: (status, attempt) => {
        log(`[${attempt}/60] Status: ${statusToString(status)}`);
      },
    });
    
    if (result.resolved) {
      log('=== DISPUTE RESOLVED ===');
      log(`Final ruling: ${rulingToString(result.ruling)}`);
      
      // If you're the claimant and won, you may need to execute the ruling
      if (result.ruling === 1 && CONFIG.privateKey) {
        log('You won! Executing ruling...');
        const writeClient = createWriteClient(CONFIG.privateKey);
        const hash = await writeClient.resolveDispute(disputeId);
        log(`Ruling executed: ${hash}`);
      }
    } else {
      log('Timed out waiting for resolution');
    }
  } else {
    log('');
    log('Tip: Run with --poll to wait for resolution');
    log('Example: npm run monitor -- 1 --poll');
  }
}

// ============ Summary View ============

async function getDisputeSummary(disputeId: bigint): Promise<{
  id: string;
  status: string;
  ruling: string;
  amount: string;
  hoursRemaining: number;
  canAppeal: boolean;
}> {
  const client = createReadOnlyClient();
  const dispute = await client.getDispute(disputeId);
  
  const now = BigInt(Math.floor(Date.now() / 1000));
  const hoursRemaining = dispute.votingDeadline > now 
    ? Number(dispute.votingDeadline - now) / 3600 
    : 0;
  
  return {
    id: dispute.id.toString(),
    status: statusToString(dispute.status),
    ruling: rulingToString(dispute.ruling),
    amount: formatEther(dispute.amount) + ' ETH',
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    canAppeal: dispute.status === DisputeStatus.Resolved && dispute.appealRound < 3,
  };
}

// ============ Run ============

// Parse dispute ID from command line
const disputeIdArg = process.argv[2];

if (!disputeIdArg || disputeIdArg === '--help') {
  console.log('Usage: npm run monitor -- <disputeId> [--poll]');
  console.log('');
  console.log('Examples:');
  console.log('  npm run monitor -- 1           # Check dispute #1');
  console.log('  npm run monitor -- 1 --poll    # Poll until resolved');
  console.log('');
  console.log('Or run simulation with ID 1:');
  console.log('  npm run monitor -- 1');
  process.exit(0);
}

const disputeId = BigInt(disputeIdArg);

monitorDisputeFlow(disputeId)
  .then(() => log('Done!'))
  .catch(err => log('Error:', err));

export { getDisputeSummary };
