#!/usr/bin/env npx tsx
/**
 * Run Scenario - Simulates complete Agent A pays Agent B flow
 * 
 * This demonstrates:
 * 1. Agent A (buyer) creates an escrow job
 * 2. Agent B (seller) accepts the job
 * 3. Agent B completes the work
 * 4. Agent A reviews and releases payment
 * 5. (Optional) Dispute flow if work is rejected
 */

import { type Address } from 'viem';
import { BuyerAgent } from './buyer-agent';
import { SellerAgent } from './seller-agent';
import { log, sleep } from './shared';

// ============================================================================
// Configuration
// ============================================================================

// Demo keys (DO NOT use real keys!)
const BUYER_KEY = (process.env.BUYER_PRIVATE_KEY || '0x' + '1'.repeat(64)) as `0x${string}`;
const SELLER_KEY = (process.env.SELLER_PRIVATE_KEY || '0x' + '2'.repeat(64)) as `0x${string}`;

// Scenario options
const SCENARIO = {
  // Job specification
  job: {
    amount: '0.1',           // Payment amount in ETH
    deadline: 60 * 60,       // 1 hour
    description: 'Analyze the top 10 DeFi protocols and provide a risk assessment',
    deliverables: [
      'JSON file with risk scores (1-10) for each protocol',
      'Brief explanation of scoring methodology',
      'Top 3 recommendations',
    ],
  },
  // Simulate work quality (true = satisfactory, false = unsatisfactory)
  workQuality: true,
  // Add artificial delays to simulate real-world timing
  delays: true,
};

// ============================================================================
// Main Scenario
// ============================================================================

async function runHappyPath() {
  log('SYSTEM', '═══════════════════════════════════════════════════════════');
  log('SYSTEM', '        AGENT-TO-AGENT PAYMENT DEMO (HAPPY PATH)           ');
  log('SYSTEM', '═══════════════════════════════════════════════════════════');

  // Initialize agents
  const buyer = new BuyerAgent(BUYER_KEY);
  const seller = new SellerAgent(SELLER_KEY);

  log('SYSTEM', `Buyer address:  ${buyer.address}`);
  log('SYSTEM', `Seller address: ${seller.address}`);

  // Step 1: Buyer creates escrow
  log('SYSTEM', '\n📝 STEP 1: Creating escrow job...\n');
  if (SCENARIO.delays) await sleep(500);

  const escrowId = await buyer.createJob({
    seller: seller.address,
    amount: SCENARIO.job.amount,
    description: SCENARIO.job.description,
    deadline: SCENARIO.job.deadline,
    deliverables: SCENARIO.job.deliverables,
  });

  // Step 2: Seller scans and accepts job
  log('SYSTEM', '\n🔍 STEP 2: Seller scanning for jobs...\n');
  if (SCENARIO.delays) await sleep(500);

  await seller.acceptJob(escrowId);

  // Step 3: Seller performs work
  log('SYSTEM', '\n⚙️ STEP 3: Seller performing work...\n');
  if (SCENARIO.delays) await sleep(1000);

  const workResult = await seller.doWork(SCENARIO.job.description);

  // Step 4: Seller submits work
  log('SYSTEM', '\n📤 STEP 4: Submitting completed work...\n');
  if (SCENARIO.delays) await sleep(500);

  await seller.submitWork(escrowId, workResult);

  // Step 5: Buyer reviews work
  log('SYSTEM', '\n🔎 STEP 5: Buyer reviewing work...\n');
  if (SCENARIO.delays) await sleep(500);

  const accepted = await buyer.reviewWork(escrowId, async () => SCENARIO.workQuality);

  // Step 6: Release or dispute
  if (accepted) {
    log('SYSTEM', '\n💰 STEP 6: Releasing payment...\n');
    await buyer.releasePayment(escrowId);
    
    log('SYSTEM', '\n✅ SCENARIO COMPLETE: Payment released successfully!\n');
  } else {
    log('SYSTEM', '\n⚠️ STEP 6: Work rejected, raising dispute...\n');
    const disputeId = await buyer.raiseDispute(escrowId, 'Work does not meet requirements');
    
    log('SYSTEM', `\n🔨 Dispute raised! ID: ${disputeId}`);
    log('SYSTEM', 'Both parties can now submit evidence...\n');
  }

  return { escrowId, buyer, seller };
}

async function runDisputePath() {
  log('SYSTEM', '═══════════════════════════════════════════════════════════');
  log('SYSTEM', '        AGENT-TO-AGENT PAYMENT DEMO (DISPUTE PATH)         ');
  log('SYSTEM', '═══════════════════════════════════════════════════════════');

  // Initialize agents
  const buyer = new BuyerAgent(BUYER_KEY);
  const seller = new SellerAgent(SELLER_KEY);

  log('SYSTEM', `Buyer address:  ${buyer.address}`);
  log('SYSTEM', `Seller address: ${seller.address}`);

  // Steps 1-4: Same as happy path
  log('SYSTEM', '\n📝 Creating job, accepting, completing work...\n');
  
  const escrowId = await buyer.createJob({
    seller: seller.address,
    amount: SCENARIO.job.amount,
    description: SCENARIO.job.description,
    deadline: SCENARIO.job.deadline,
  });

  await seller.acceptJob(escrowId);
  const workResult = await seller.doWork();
  await seller.submitWork(escrowId, workResult);

  // Step 5: Buyer rejects work
  log('SYSTEM', '\n❌ STEP 5: Buyer rejects work quality...\n');
  
  const disputeId = await buyer.raiseDispute(
    escrowId, 
    'Output does not match specifications. Missing required deliverables.'
  );

  // Step 6: Both parties submit evidence
  log('SYSTEM', '\n📎 STEP 6: Submitting evidence...\n');

  await buyer.submitEvidence(
    disputeId,
    'Original Requirements',
    `Job required:
    - JSON file with risk scores
    - Methodology explanation
    - Top 3 recommendations
    
    Received output was incomplete and missing the recommendations section.`
  );

  await seller.submitEvidence(
    disputeId,
    'Work Completion Proof',
    `Completed work included:
    - Full JSON analysis
    - Detailed methodology
    - Risk scores for all 10 protocols
    
    The recommendations were implicit in the risk scores (lowest 3 = recommended).`
  );

  // Step 7: Await resolution
  log('SYSTEM', '\n⏳ STEP 7: Awaiting AI arbitration...\n');
  log('SYSTEM', 'In production, KaraDispute AI analyzes evidence and makes ruling.');
  log('SYSTEM', 'Typical resolution time: 24-48 hours.\n');

  log('SYSTEM', '═══════════════════════════════════════════════════════════');
  log('SYSTEM', 'SCENARIO COMPLETE: Dispute raised and evidence submitted');
  log('SYSTEM', '═══════════════════════════════════════════════════════════');

  return { escrowId, disputeId, buyer, seller };
}

async function runBatchPayments() {
  log('SYSTEM', '═══════════════════════════════════════════════════════════');
  log('SYSTEM', '        BATCH PAYMENTS DEMO (Multiple jobs)                ');
  log('SYSTEM', '═══════════════════════════════════════════════════════════');

  const buyer = new BuyerAgent(BUYER_KEY);
  
  // Create multiple jobs for different sellers
  const jobs = [
    { seller: '0x' + 'a'.repeat(40), task: 'Data analysis', amount: '0.05' },
    { seller: '0x' + 'b'.repeat(40), task: 'API integration', amount: '0.1' },
    { seller: '0x' + 'c'.repeat(40), task: 'Smart contract audit', amount: '0.2' },
  ];

  log('SYSTEM', 'Creating batch of 3 escrow jobs...\n');

  const escrowIds: bigint[] = [];
  for (const job of jobs) {
    const id = await buyer.createJob({
      seller: job.seller as Address,
      amount: job.amount,
      description: job.task,
      deadline: 24 * 60 * 60,
    });
    escrowIds.push(id);
    log('SYSTEM', `Created escrow ${id} for ${job.task}`);
  }

  log('SYSTEM', `\n✅ Created ${escrowIds.length} escrows for batch processing`);
  
  return escrowIds;
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const scenario = process.argv[2] || 'happy';

  switch (scenario) {
    case 'happy':
      await runHappyPath();
      break;
    case 'dispute':
      await runDisputePath();
      break;
    case 'batch':
      await runBatchPayments();
      break;
    default:
      console.log(`
Usage: npx tsx run-scenario.ts [scenario]

Scenarios:
  happy    - Full payment flow (default)
  dispute  - Payment with dispute resolution
  batch    - Multiple parallel payments
`);
  }
}

main().catch(console.error);
