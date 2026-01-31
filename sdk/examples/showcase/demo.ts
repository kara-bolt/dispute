#!/usr/bin/env npx tsx
/**
 * @kara/dispute-sdk Showcase Demo
 * 
 * This demo showcases the key features of the SDK without requiring
 * deployed contracts. Run with: npx tsx demo.ts
 * 
 * Features demonstrated:
 * 1. DisputeFlow high-level API
 * 2. Template system for common dispute types
 * 3. Evidence builders
 * 4. Webhook setup
 * 5. CLI preview
 */

import { 
  DisputeFlow, 
  DISPUTE_TEMPLATES,
  buildEvidence,
  WebhookRelay,
  verifyWebhookSignature,
  KARA_TIERS,
  DEFAULT_ESCROW_DEADLINE,
} from '../../src';

// ANSI colors for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

const c = colors;

function header(text: string) {
  console.log(`\n${c.bright}${c.cyan}═══════════════════════════════════════════════════════════════${c.reset}`);
  console.log(`${c.bright}${c.cyan}  ${text}${c.reset}`);
  console.log(`${c.bright}${c.cyan}═══════════════════════════════════════════════════════════════${c.reset}\n`);
}

function section(text: string) {
  console.log(`\n${c.bright}${c.yellow}▸ ${text}${c.reset}\n`);
}

function code(label: string, value: string) {
  console.log(`  ${c.dim}${label}:${c.reset} ${c.green}${value}${c.reset}`);
}

function json(obj: unknown) {
  console.log(`  ${c.dim}${JSON.stringify(obj, null, 2).split('\n').join('\n  ')}${c.reset}`);
}

async function main() {
  header('🚀 @kara/dispute-sdk Showcase');
  
  console.log(`${c.dim}  Built for AI agents. Simple, typed, ready for agent-to-agent transactions.${c.reset}`);
  console.log(`${c.dim}  Version: 0.1.0 | Chain: Base | Status: Pre-deployment${c.reset}`);

  // ─────────────────────────────────────────────────────────────────
  section('1. Dispute Templates');
  
  console.log('  The SDK includes pre-built templates for 8 common dispute types:\n');
  
  Object.entries(DISPUTE_TEMPLATES).forEach(([key, template]) => {
    console.log(`  ${c.magenta}•${c.reset} ${c.bright}${key}${c.reset}`);
    console.log(`    ${c.dim}${template.title}${c.reset}`);
    console.log(`    ${c.dim}Fields: ${template.evidenceFields.join(', ')}${c.reset}\n`);
  });

  // ─────────────────────────────────────────────────────────────────
  section('2. Quick Evidence Builders');
  
  console.log('  Build structured evidence in one line:\n');
  
  // Build structured evidence with full context
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  
  const evidence1 = buildEvidence({
    type: 'service_not_delivered',
    claimant: mockAddress,
    respondent: mockAddress,
    amount: BigInt(1e18), // 1 ETH
    description: 'AI translation service was not delivered by deadline',
    details: {
      serviceDescription: 'AI translation service',
      agreedDeadline: '2026-01-15',
    },
  });
  console.log(`  ${c.blue}buildEvidence({${c.reset}`);
  console.log(`  ${c.dim}  type: 'service_not_delivered',${c.reset}`);
  console.log(`  ${c.dim}  claimant: '0x...', respondent: '0x...',${c.reset}`);
  console.log(`  ${c.dim}  amount: parseEther('1'),${c.reset}`);
  console.log(`  ${c.dim}  description: 'AI translation service was not delivered',${c.reset}`);
  console.log(`  ${c.dim}})${c.reset}`);
  console.log();
  console.log(`  ${c.dim}Result:${c.reset}`);
  json(evidence1);
  
  console.log();
  
  const evidence2 = buildEvidence({
    type: 'quality_issues',
    claimant: mockAddress,
    respondent: mockAddress,
    amount: BigInt(5e17), // 0.5 ETH
    description: 'Delivered work had significant quality issues',
    details: {
      issues: ['Output contained 40% errors', 'Missed formatting requirements'],
    },
  });
  console.log(`  ${c.blue}buildEvidence({ type: 'quality_issues', ... })${c.reset}`);
  json(evidence2);

  // ─────────────────────────────────────────────────────────────────
  section('3. DisputeFlow High-Level API');
  
  console.log('  The DisputeFlow class provides the simplest way to create disputes:\n');
  
  console.log(`  ${c.blue}// One-liner dispute creation${c.reset}`);
  console.log(`  ${c.dim}const flow = new DisputeFlow({ chain: 'base', privateKey: '0x...' });${c.reset}`);
  console.log(`  ${c.dim}await flow.disputeServiceNotDelivered({${c.reset}`);
  console.log(`  ${c.dim}  respondent: '0xCounterparty...',${c.reset}`);
  console.log(`  ${c.dim}  amount: parseEther('0.5'),${c.reset}`);
  console.log(`  ${c.dim}  service: 'API integration work',${c.reset}`);
  console.log(`  ${c.dim}  agreedDeadline: '2026-01-15'${c.reset}`);
  console.log(`  ${c.dim}});${c.reset}\n`);
  
  console.log('  Available quick methods:');
  console.log(`  ${c.green}•${c.reset} disputeServiceNotDelivered()`);
  console.log(`  ${c.green}•${c.reset} disputeQualityIssues()`);
  console.log(`  ${c.green}•${c.reset} disputePartialDelivery()`);
  console.log(`  ${c.green}•${c.reset} createDispute() ${c.dim}(flexible)${c.reset}`);
  console.log(`  ${c.green}•${c.reset} disputeEscrow() ${c.dim}(from existing escrow)${c.reset}`);

  // ─────────────────────────────────────────────────────────────────
  section('4. $KARA Token Discounts');
  
  console.log('  Hold $KARA tokens to get dispute fee discounts:\n');
  
  Object.entries(KARA_TIERS).forEach(([tier, { threshold, discount }]) => {
    const thresholdStr = (threshold / BigInt(10**18)).toLocaleString().padStart(12, ' ');
    const discountPct = discount / 100; // basis points to percentage
    const discountStr = `${discountPct}%`.padStart(4, ' ');
    const bar = '█'.repeat(discountPct);
    console.log(`  ${c.bright}${tier}${c.reset}: ${thresholdStr} KARA → ${c.green}${discountStr} off${c.reset} ${c.dim}${bar}${c.reset}`);
  });

  // ─────────────────────────────────────────────────────────────────
  section('5. Webhook Events');
  
  console.log('  Subscribe to real-time dispute events:\n');
  
  const relay = new WebhookRelay();
  
  const subId = relay.register({
    url: 'https://my-agent.example/webhooks',
    secret: 'my-secret-key',
    events: ['dispute.created', 'dispute.resolved', 'escrow.disputed'],
    filters: {
      addresses: ['0xMyAgent...'],
    },
  });
  
  console.log(`  ${c.blue}// Register webhook${c.reset}`);
  console.log(`  ${c.dim}relay.register({${c.reset}`);
  console.log(`  ${c.dim}  url: 'https://my-agent.example/webhooks',${c.reset}`);
  console.log(`  ${c.dim}  secret: 'my-secret-key',${c.reset}`);
  console.log(`  ${c.dim}  events: ['dispute.created', 'dispute.resolved'],${c.reset}`);
  console.log(`  ${c.dim}});${c.reset}\n`);
  
  console.log('  Event types:');
  const events = [
    'dispute.created', 'dispute.voting_started', 'dispute.vote_cast',
    'dispute.resolved', 'dispute.appealed',
    'escrow.created', 'escrow.disputed', 'escrow.released', 'escrow.cancelled'
  ];
  events.forEach(e => console.log(`  ${c.green}•${c.reset} ${e}`));
  
  console.log(`\n  ${c.blue}// Verify webhook signature${c.reset}`);
  console.log(`  ${c.dim}const isValid = verifyWebhookSignature(payload, signature, secret);${c.reset}`);

  // ─────────────────────────────────────────────────────────────────
  section('6. CLI Tool');
  
  console.log('  Query disputes from the command line:\n');
  
  console.log(`  ${c.blue}$ kara-dispute get 42${c.reset}`);
  console.log(`  ${c.dim}Dispute #42${c.reset}`);
  console.log(`  ${c.dim}├─ Status: Resolved${c.reset}`);
  console.log(`  ${c.dim}├─ Claimant: 0x1234...${c.reset}`);
  console.log(`  ${c.dim}├─ Respondent: 0x5678...${c.reset}`);
  console.log(`  ${c.dim}└─ Ruling: ClaimantWins${c.reset}\n`);
  
  console.log(`  ${c.blue}$ kara-dispute votes 42${c.reset}`);
  console.log(`  ${c.dim}Voting for Dispute #42${c.reset}`);
  console.log(`  ${c.dim}├─ For Claimant:  ████████░░ 80%${c.reset}`);
  console.log(`  ${c.dim}├─ For Respondent: ██░░░░░░░░ 20%${c.reset}`);
  console.log(`  ${c.dim}└─ Total Votes: 50${c.reset}\n`);
  
  console.log(`  ${c.blue}$ kara-dispute balance 0xMyWallet${c.reset}`);
  console.log(`  ${c.dim}KARA Balance: 15,000 KARA${c.reset}`);
  console.log(`  ${c.dim}Tier: TIER2 (10% discount)${c.reset}`);

  // ─────────────────────────────────────────────────────────────────
  section('7. Constants & Configuration');
  
  code('Default escrow deadline', `${DEFAULT_ESCROW_DEADLINE} seconds (${DEFAULT_ESCROW_DEADLINE / 86400} days)`);
  code('Dispute reasons', Object.keys(DISPUTE_TEMPLATES).join(', '));
  code('Supported chains', 'base, baseSepolia');

  // ─────────────────────────────────────────────────────────────────
  header('📦 Ready to Use');
  
  console.log(`  ${c.bright}Install:${c.reset}     npm install @kara/dispute-sdk viem`);
  console.log(`  ${c.bright}Docs:${c.reset}        docs/QUICKSTART.md`);
  console.log(`  ${c.bright}Examples:${c.reset}    examples/agent-to-agent-payment/`);
  console.log(`  ${c.bright}Tests:${c.reset}       npm test ${c.dim}(156 tests)${c.reset}`);
  console.log(`  ${c.bright}CLI:${c.reset}         npx kara-dispute --help\n`);
  
  console.log(`${c.dim}  Status: SDK complete, awaiting contract deployment on Base${c.reset}\n`);
}

main().catch(console.error);
