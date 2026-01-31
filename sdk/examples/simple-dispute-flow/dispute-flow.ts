/**
 * Combined Dispute Flow Demo
 * 
 * Demonstrates all three dispute creation patterns:
 * 1. Escrow Dispute - Protected payments with dispute option
 * 2. Direct Dispute - Direct dispute creation with KARA
 * 3. Monitor Dispute - Checking dispute status
 * 
 * Run: npm run demo
 */

import { 
  createReadOnlyClient, 
  createWriteClient, 
  createEvidence,
  evidenceToURI,
  statusToString,
  rulingToString,
  log,
  parseEther,
  formatEther,
  sleep,
  CONFIG,
} from './utils';
import { DisputeStatus, TransactionStatus } from '@kara/dispute-sdk';
import type { Address } from 'viem';

// ============ Demo Scenarios ============

async function demoEscrowDispute(): Promise<void> {
  log('');
  log('╔════════════════════════════════════════╗');
  log('║  SCENARIO 1: Escrow → Dispute Flow     ║');
  log('╚════════════════════════════════════════╝');
  log('');
  
  if (!CONFIG.privateKey) {
    log('📋 This flow creates an escrow, then disputes it if not delivered.');
    log('');
    log('Steps:');
    log('  1. Create escrow with seller address, amount, deadline');
    log('  2. Wait for delivery or deadline');
    log('  3. If no delivery: raise dispute with evidence');
    log('  4. Arbitrators vote, ruling executed');
    log('');
    log('Code:');
    log('```');
    log('const { transactionId } = await client.agentCreateEscrow({');
    log("  from: myAddress,");
    log("  to: '0xSeller...',");
    log("  amount: parseEther('0.1'),");
    log("  description: 'Create 100 social posts',");
    log("  deadlineSeconds: 7 * 24 * 60 * 60, // 7 days");
    log('});');
    log('');
    log('// If seller doesn\'t deliver:');
    log('const { disputeId } = await client.raiseDispute({');
    log('  transactionId,');
    log("  evidenceURI: 'ipfs://...',");
    log('});');
    log('```');
    return;
  }
  
  // Live demo with wallet
  const client = createWriteClient(CONFIG.privateKey);
  
  log('Creating escrow...');
  const { transactionId, hash } = await client.agentCreateEscrow({
    from: client.account.address,
    to: CONFIG.counterparty,
    amount: parseEther('0.001'),
    description: 'Demo escrow for dispute flow',
    deadlineSeconds: 300, // 5 minutes for demo
  });
  
  log(`✅ Escrow created: ID ${transactionId}, tx: ${hash}`);
  
  const escrow = await client.getEscrowTransaction(transactionId);
  log('Escrow details:', {
    id: escrow.id.toString(),
    amount: formatEther(escrow.amount) + ' ETH',
    status: TransactionStatus[escrow.status],
  });
}

async function demoDirectDispute(): Promise<void> {
  log('');
  log('╔════════════════════════════════════════╗');
  log('║  SCENARIO 2: Direct Dispute Flow       ║');
  log('╚════════════════════════════════════════╝');
  log('');
  
  if (!CONFIG.privateKey) {
    log('📋 This flow creates a dispute directly, paid with KARA tokens.');
    log('');
    log('Steps:');
    log('  1. Prepare evidence (structured JSON)');
    log('  2. Pay arbitration fee in KARA (auto-discounted if holder)');
    log('  3. Dispute created, arbitrators assigned');
    log('  4. Voting period, then resolution');
    log('');
    log('Code:');
    log('```');
    log('const evidence = {');
    log("  title: 'Breach of agreement',");
    log("  description: 'Agent failed to deliver...',");
    log("  requestedOutcome: 'Refund 0.5 ETH',");
    log("  amount: parseEther('0.5').toString(),");
    log('};');
    log('');
    log('const { disputeId } = await client.agentCreateDispute({');
    log('  from: myAddress,');
    log("  counterparty: '0xOther...',");
    log("  amount: parseEther('0.5'),");
    log("  description: 'Breach of agreement',");
    log('  evidence,');
    log('});');
    log('```');
    log('');
    log('💡 Tip: Hold KARA tokens for discounts:');
    log('   100 KARA = 5%, 1k = 10%, 10k = 20%, 100k = 30%');
    return;
  }
  
  // Live demo with wallet
  const client = createWriteClient(CONFIG.privateKey);
  
  log('Checking KARA balance...');
  const balance = await client.getKaraBalance(client.account.address);
  const discount = client.calculateDiscount(balance);
  log(`KARA: ${formatEther(balance)}, Discount: ${discount/100}%`);
  
  log('Would create dispute here (skipping to save KARA)');
}

async function demoMonitorDispute(): Promise<void> {
  log('');
  log('╔════════════════════════════════════════╗');
  log('║  SCENARIO 3: Monitor Dispute Flow      ║');
  log('╚════════════════════════════════════════╝');
  log('');
  
  const client = createReadOnlyClient();
  
  log('📋 This flow monitors an existing dispute until resolution.');
  log('');
  log('Steps:');
  log('  1. Get dispute by ID');
  log('  2. Check current votes and ruling');
  log('  3. Poll until resolved (optional)');
  log('  4. Execute ruling if you won');
  log('');
  
  // Try to get real dispute count
  try {
    const count = await client.getDisputeCount();
    log(`Disputes on-chain: ${count}`);
    
    if (count > 0n) {
      log('');
      log('Checking latest dispute...');
      const dispute = await client.getDispute(count);
      log('Dispute:', {
        id: dispute.id.toString(),
        status: statusToString(dispute.status),
        ruling: rulingToString(dispute.ruling),
        amount: formatEther(dispute.amount) + ' ETH',
      });
    }
  } catch (error) {
    log('Could not fetch disputes (contract may not be deployed)');
  }
  
  log('');
  log('Code:');
  log('```');
  log('const dispute = await client.getDispute(1n);');
  log('console.log(dispute.status); // Open, Voting, Resolved, Appealed');
  log('');
  log('const votes = await client.getVoteResult(1n);');
  log('console.log(votes.forClaimant, votes.forRespondent);');
  log('');
  log('// Poll until resolved');
  log('while (dispute.status !== DisputeStatus.Resolved) {');
  log('  await sleep(60_000);');
  log('  dispute = await client.getDispute(1n);');
  log('}');
  log('```');
}

async function demoBestPractices(): Promise<void> {
  log('');
  log('╔════════════════════════════════════════╗');
  log('║  BEST PRACTICES                        ║');
  log('╚════════════════════════════════════════╝');
  log('');
  
  log('📋 Evidence Structure:');
  log('```json');
  log(JSON.stringify({
    title: "Clear title describing the issue",
    description: "Detailed explanation with dates",
    timeline: [
      { date: "2024-01-01", event: "Agreement made" },
      { date: "2024-01-08", event: "Deadline missed" },
    ],
    attachments: [
      { name: "agreement.pdf", cid: "Qm..." },
    ],
    requestedOutcome: "Specific resolution wanted",
    amount: "100000000000000000",
  }, null, 2));
  log('```');
  
  log('');
  log('⏰ Deadlines:');
  log('  - Escrows: Set realistic deadlines (7-30 days typical)');
  log('  - Disputes: Voting period is ~48h');
  log('  - Appeals: Must be filed within 24h of ruling');
  
  log('');
  log('💰 Costs:');
  log('  - Escrow creation: ~$0.02 gas');
  log('  - Raise dispute: ~$0.03 gas + arbitration fee');
  log('  - Direct dispute: ~$0.02 gas + KARA fee');
  log('  - Appeals: 2x the original fee');
  
  log('');
  log('🎯 Tips:');
  log('  - Always include evidence (increases win rate)');
  log('  - Hold KARA for discounts (up to 30% off)');
  log('  - Monitor disputes regularly');
  log('  - Appeal only if you have new evidence');
}

// ============ Run All Demos ============

async function main(): Promise<void> {
  log('╔═══════════════════════════════════════════════════════════╗');
  log('║  KaraDispute SDK - Simple Dispute Flow Demo               ║');
  log('╚═══════════════════════════════════════════════════════════╝');
  
  if (!CONFIG.privateKey) {
    log('');
    log('ℹ️  Running in SIMULATION mode (no PRIVATE_KEY set)');
    log('   Set PRIVATE_KEY env var for live transactions');
  }
  
  await demoEscrowDispute();
  await sleep(500);
  
  await demoDirectDispute();
  await sleep(500);
  
  await demoMonitorDispute();
  await sleep(500);
  
  await demoBestPractices();
  
  log('');
  log('═══════════════════════════════════════════════════════════');
  log('Run individual examples:');
  log('  npm run escrow-dispute   # Escrow → Dispute flow');
  log('  npm run direct-dispute   # Direct dispute creation');
  log('  npm run monitor -- 1     # Monitor dispute #1');
  log('═══════════════════════════════════════════════════════════');
}

main()
  .then(() => log('Demo complete!'))
  .catch(err => {
    log('Error:', err);
    process.exit(1);
  });
