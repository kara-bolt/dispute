/**
 * Escrow → Dispute Flow
 * 
 * Shows how to:
 * 1. Create an escrow payment
 * 2. Wait for delivery/timeout
 * 3. Raise a dispute if needed
 * 4. Monitor resolution
 * 
 * Use case: You're paying another agent for a service and want protection.
 */

import { 
  createReadOnlyClient, 
  createWriteClient, 
  createEvidence,
  evidenceToURI,
  statusToString,
  rulingToString,
  pollUntilResolved,
  log,
  parseEther,
  formatEther,
  CONFIG,
} from './utils';
import { TransactionStatus, DisputeStatus } from '@kara/dispute-sdk';
import type { Address } from 'viem';

// ============ Configuration ============

interface EscrowConfig {
  seller: Address;           // Who you're paying
  amount: bigint;            // Payment amount
  description: string;       // What you're paying for
  deadlineSeconds: number;   // How long seller has to deliver
}

// ============ Main Flow ============

async function escrowDisputeFlow(config: EscrowConfig): Promise<void> {
  log('=== Escrow Dispute Flow ===');
  
  // Step 1: Setup client
  if (!CONFIG.privateKey) {
    log('Simulation mode (no PRIVATE_KEY set)');
    return simulateFlow(config);
  }
  
  const client = createWriteClient(CONFIG.privateKey);
  const myAddress = client.account.address;
  log(`Wallet: ${myAddress}`);
  
  // Step 2: Create escrow
  log('Creating escrow...');
  const { transactionId, hash: escrowHash } = await client.agentCreateEscrow({
    from: myAddress,
    to: config.seller,
    amount: config.amount,
    description: config.description,
    deadlineSeconds: config.deadlineSeconds,
  });
  log(`Escrow created: ID ${transactionId}, tx: ${escrowHash}`);
  
  // Step 3: Check escrow status
  const escrow = await client.getEscrowTransaction(transactionId);
  log('Escrow details:', {
    id: escrow.id.toString(),
    payer: escrow.payer,
    payee: escrow.payee,
    amount: formatEther(escrow.amount) + ' ETH',
    deadline: new Date(Number(escrow.deadline) * 1000).toISOString(),
    status: TransactionStatus[escrow.status],
  });
  
  // Step 4: Simulate waiting for delivery
  // In reality, you'd check if the seller delivered
  log('Waiting for delivery deadline...');
  const delivered = false; // Simulate non-delivery
  
  if (delivered) {
    log('Seller delivered! Releasing escrow...');
    const releaseHash = await client.releaseEscrow(transactionId);
    log(`Escrow released: ${releaseHash}`);
    return;
  }
  
  // Step 5: Raise dispute
  log('No delivery. Raising dispute...');
  
  const evidence = createEvidence({
    title: 'Non-delivery of service',
    description: `Agreed to "${config.description}" but nothing was delivered before deadline.`,
    amount: config.amount,
    requestedOutcome: `Full refund of ${formatEther(config.amount)} ETH`,
    timeline: [
      { date: new Date().toISOString(), event: 'Escrow created', proof: escrowHash },
      { date: new Date().toISOString(), event: 'Deadline passed, no delivery' },
    ],
  });
  
  const { disputeId, hash: disputeHash } = await client.raiseDispute({
    transactionId,
    evidenceURI: evidenceToURI(evidence),
  });
  
  log(`Dispute raised: ID ${disputeId}, tx: ${disputeHash}`);
  
  // Step 6: Monitor dispute
  log('Monitoring dispute resolution...');
  const result = await pollUntilResolved(client, disputeId, {
    maxAttempts: 10,
    intervalMs: 5000, // 5s for demo
    onStatus: (status, attempt) => {
      log(`Poll ${attempt}: Status = ${statusToString(status)}`);
    },
  });
  
  // Step 7: Handle outcome
  log('Dispute result:', {
    status: statusToString(result.status),
    ruling: rulingToString(result.ruling),
    resolved: result.resolved,
  });
  
  if (result.resolved && result.ruling === 1) {
    log('You won! Funds should be returned.');
  } else if (result.resolved && result.ruling === 2) {
    log('Seller won. Funds released to seller.');
  } else {
    log('Dispute still pending or refused to arbitrate.');
  }
}

// ============ Simulation Mode ============

function simulateFlow(config: EscrowConfig): void {
  log('--- SIMULATING FLOW ---');
  
  log('1. Would create escrow:', {
    to: config.seller,
    amount: formatEther(config.amount) + ' ETH',
    description: config.description,
    deadline: `${config.deadlineSeconds} seconds from now`,
  });
  
  log('2. Would wait for delivery deadline');
  
  log('3. If no delivery, would raise dispute with evidence:', {
    title: 'Non-delivery of service',
    description: `Agreed to "${config.description}" but nothing was delivered before deadline.`,
    requestedOutcome: `Full refund of ${formatEther(config.amount)} ETH`,
  });
  
  log('4. Would monitor dispute until resolved');
  
  log('5. Outcome: Claimant wins → get refund, Respondent wins → seller gets paid');
  
  log('--- END SIMULATION ---');
}

// ============ Run ============

const demoConfig: EscrowConfig = {
  seller: CONFIG.counterparty,
  amount: parseEther('0.01'),
  description: 'Generate 100 social media posts',
  deadlineSeconds: 7 * 24 * 60 * 60, // 7 days
};

escrowDisputeFlow(demoConfig)
  .then(() => log('Done!'))
  .catch(err => log('Error:', err));
