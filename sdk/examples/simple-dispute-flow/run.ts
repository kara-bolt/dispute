/**
 * Simple Dispute Flow - Full Example
 * 
 * Demonstrates all features of the DisputeFlow helper:
 * - One-liner dispute creation
 * - Quick methods for common scenarios
 * - Template-based evidence
 * - Status monitoring
 * 
 * Usage:
 *   PRIVATE_KEY=0x... npx tsx run.ts [scenario]
 * 
 * Scenarios:
 *   basic     - Basic dispute creation
 *   quick     - Quick methods demo
 *   templates - Show all templates
 *   monitor   - Status monitoring demo
 */

import { DisputeFlow, DISPUTE_TEMPLATES } from '@kara/dispute-sdk';
import { parseEther, formatEther, zeroAddress } from 'viem';

// ============ Configuration ============

const CHAIN = 'base-sepolia' as const;
const DEMO_COUNTERPARTY = '0x1111111111111111111111111111111111111111';

// Simulation mode (no actual transactions)
const SIMULATION = !process.env.PRIVATE_KEY;

// ============ Demo Scenarios ============

async function demoBasicDispute(flow: DisputeFlow) {
  console.log('\n📋 Basic Dispute Creation\n');
  console.log('Creating a dispute with minimal parameters...\n');
  
  if (SIMULATION) {
    console.log('SIMULATION MODE - Would call:');
    console.log(`
flow.createDispute({
  against: '${DEMO_COUNTERPARTY}',
  amount: parseEther('0.5'),
  reason: 'service_not_delivered',
  description: 'Agent failed to deliver promised analysis',
});
    `);
    return;
  }
  
  const result = await flow.createDispute({
    against: DEMO_COUNTERPARTY as `0x${string}`,
    amount: parseEther('0.5'),
    reason: 'service_not_delivered',
    description: 'Agent failed to deliver promised analysis',
  });
  
  console.log(`✅ Dispute created!`);
  console.log(`   ID: ${result.disputeId}`);
  console.log(`   TX: ${result.txHash}`);
  console.log(`   Status: ${result.dispute.status}`);
  console.log(`   Voting deadline: ${result.votingDeadline.toISOString()}`);
}

async function demoQuickMethods(flow: DisputeFlow) {
  console.log('\n⚡ Quick Methods Demo\n');
  
  const examples = [
    {
      name: 'Service Not Delivered',
      code: `await flow.disputeServiceNotDelivered({
  against: '0x...',
  amount: parseEther('1'),
  serviceDescription: 'Analyze 500 documents and return summary',
  deadline: new Date('2024-01-15'),
});`,
    },
    {
      name: 'Quality Issues',
      code: `await flow.disputeQualityIssues({
  against: '0x...',
  amount: parseEther('0.5'),
  issues: [
    'Missing error handling',
    'No test coverage',
    'Crashes on edge cases'
  ],
});`,
    },
    {
      name: 'Partial Delivery',
      code: `await flow.disputePartialDelivery({
  against: '0x...',
  amount: parseEther('0.3'),
  deliveredPercentage: 40,
  missingItems: ['API docs', 'Tests', 'Deployment guide'],
});`,
    },
  ];
  
  for (const example of examples) {
    console.log(`📌 ${example.name}:\n`);
    console.log(example.code);
    console.log();
  }
}

async function demoTemplates() {
  console.log('\n📚 Available Dispute Templates\n');
  
  for (const [key, template] of Object.entries(DISPUTE_TEMPLATES)) {
    console.log(`${template.title} (${key})`);
    console.log(`  ${template.description}`);
    console.log(`  Suggested deadline: ${template.suggestedDeadlineHours}h`);
    console.log(`  Evidence fields: ${template.evidenceFields.join(', ')}`);
    console.log();
  }
}

async function demoMonitoring(flow: DisputeFlow) {
  console.log('\n📊 Status Monitoring Demo\n');
  
  console.log('Get dispute status:');
  console.log(`
const status = await flow.getStatus(disputeId);
console.log(status.statusText);     // "Voting"
console.log(status.votingOpen);     // true
console.log(status.votes);          // { forClaimant: 5n, forRespondent: 2n, abstained: 1n }
console.log(status.votingTimeRemaining); // seconds left
  `);
  
  console.log('Wait for resolution:');
  console.log(`
const result = await flow.waitForResolution(disputeId, {
  pollIntervalMs: 60_000,  // Check every minute
  timeoutMs: 7 * 24 * 60 * 60 * 1000, // 7 day timeout
});

switch (result.ruling) {
  case 'claimant':
    console.log('You won! Funds returned.');
    break;
  case 'respondent':
    console.log('Respondent won. Funds released to them.');
    break;
  case 'refused':
    console.log('Arbitrators refused to rule. Funds split.');
    break;
}
  `);
}

// ============ Main ============

async function main() {
  const scenario = process.argv[2] || 'all';
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  KaraDispute - Simple Dispute Flow Example');
  console.log('═══════════════════════════════════════════════════════════');
  
  if (SIMULATION) {
    console.log('\n⚠️  SIMULATION MODE (no PRIVATE_KEY set)');
    console.log('    Set PRIVATE_KEY env var to run actual transactions\n');
  }
  
  // Initialize flow
  let flow: DisputeFlow | undefined;
  
  if (!SIMULATION) {
    flow = new DisputeFlow({
      chain: CHAIN,
      privateKey: process.env.PRIVATE_KEY as `0x${string}`,
    });
    console.log(`\nAgent address: ${flow.address}`);
  } else {
    // Create read-only flow for demos
    flow = new DisputeFlow({ chain: CHAIN });
  }
  
  // Run scenarios
  switch (scenario) {
    case 'basic':
      await demoBasicDispute(flow);
      break;
    case 'quick':
      await demoQuickMethods(flow);
      break;
    case 'templates':
      await demoTemplates();
      break;
    case 'monitor':
      await demoMonitoring(flow);
      break;
    case 'all':
    default:
      await demoTemplates();
      await demoQuickMethods(flow);
      await demoMonitoring(flow);
      await demoBasicDispute(flow);
      break;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Demo complete! See README.md for full documentation.');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
