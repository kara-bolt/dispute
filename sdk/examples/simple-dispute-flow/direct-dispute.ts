/**
 * Direct Dispute Creation
 * 
 * Shows how to:
 * 1. Prepare structured evidence
 * 2. Create a dispute directly (no escrow)
 * 3. Pay with KARA tokens (with holder discounts)
 * 4. Get the dispute ID for monitoring
 * 
 * Use case: Resolving off-chain agreements or disputes not tied to escrow.
 */

import { 
  createReadOnlyClient, 
  createWriteClient, 
  createEvidence,
  evidenceToURI,
  statusToString,
  log,
  parseEther,
  formatEther,
  CONFIG,
} from './utils';
import type { Address } from 'viem';

// ============ Configuration ============

interface DisputeConfig {
  counterparty: Address;     // Who you're disputing with
  amount: bigint;            // Amount at stake
  title: string;             // Dispute title
  description: string;       // What happened
  requestedOutcome: string;  // What you want
}

// ============ Main Flow ============

async function directDisputeFlow(config: DisputeConfig): Promise<void> {
  log('=== Direct Dispute Flow ===');
  
  // Step 1: Setup client
  if (!CONFIG.privateKey) {
    log('Simulation mode (no PRIVATE_KEY set)');
    return simulateFlow(config);
  }
  
  const client = createWriteClient(CONFIG.privateKey);
  const myAddress = client.account.address;
  log(`Wallet: ${myAddress}`);
  
  // Step 2: Check KARA balance and discount
  const karaBalance = await client.getKaraBalance(myAddress);
  const discount = client.calculateDiscount(karaBalance);
  log('KARA status:', {
    balance: formatEther(karaBalance) + ' KARA',
    discount: `${discount / 100}%`,
  });
  
  // Step 3: Get arbitration cost
  const baseCost = await client.getArbitrationCostKara(myAddress);
  log(`Arbitration cost: ${formatEther(baseCost)} KARA (after discount)`);
  
  // Step 4: Prepare evidence
  log('Preparing evidence...');
  
  const evidence = createEvidence({
    title: config.title,
    description: config.description,
    amount: config.amount,
    requestedOutcome: config.requestedOutcome,
    timeline: [
      { date: new Date().toISOString(), event: 'Dispute filed' },
    ],
    attachments: [
      // In production, add IPFS CIDs to supporting documents
      // { name: 'agreement.pdf', cid: 'Qm...' },
      // { name: 'chat_logs.txt', cid: 'Qm...' },
    ],
  });
  
  const evidenceURI = evidenceToURI(evidence);
  log('Evidence prepared:', { uri: evidenceURI.slice(0, 50) + '...' });
  
  // Step 5: Create dispute
  log('Creating dispute...');
  
  const { disputeId, hash } = await client.agentCreateDispute({
    from: myAddress,
    counterparty: config.counterparty,
    amount: config.amount,
    description: config.title,
    evidence,
  });
  
  log(`Dispute created successfully!`, {
    disputeId: disputeId.toString(),
    txHash: hash,
  });
  
  // Step 6: Verify dispute on-chain
  const dispute = await client.getDispute(disputeId);
  log('Dispute on-chain:', {
    id: dispute.id.toString(),
    claimant: dispute.claimant,
    respondent: dispute.respondent,
    amount: formatEther(dispute.amount) + ' ETH',
    status: statusToString(dispute.status),
    votingDeadline: new Date(Number(dispute.votingDeadline) * 1000).toISOString(),
  });
  
  log('');
  log('Next steps:');
  log('1. Wait for arbitrators to vote');
  log('2. Monitor with: npm run monitor -- ' + disputeId.toString());
  log('3. Appeal if needed (costs 2x KARA)');
}

// ============ Simulation Mode ============

function simulateFlow(config: DisputeConfig): void {
  log('--- SIMULATING FLOW ---');
  
  log('1. Would check KARA balance for discount tier');
  log('   Tiers: 100 KARA (5%), 1k (10%), 10k (20%), 100k (30%)');
  
  log('2. Would prepare evidence:', {
    title: config.title,
    description: config.description,
    amount: formatEther(config.amount) + ' ETH',
    requestedOutcome: config.requestedOutcome,
  });
  
  log('3. Would create dispute via createDisputeWithKara()');
  log('   - Auto-approves KARA spend');
  log('   - Submits evidence on-chain');
  log('   - Returns dispute ID');
  
  log('4. Dispute lifecycle:');
  log('   Open → Voting → Resolved (or Appealed)');
  
  log('--- END SIMULATION ---');
}

// ============ Run ============

const demoConfig: DisputeConfig = {
  counterparty: CONFIG.counterparty,
  amount: parseEther('0.5'),
  title: 'Breach of service agreement',
  description: 'Agent promised 99.9% uptime but service was down for 3 days.',
  requestedOutcome: 'Prorated refund of 0.5 ETH for downtime',
};

directDisputeFlow(demoConfig)
  .then(() => log('Done!'))
  .catch(err => log('Error:', err));
