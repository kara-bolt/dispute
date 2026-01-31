#!/usr/bin/env node
/**
 * KaraDispute CLI
 * Quick command-line access to dispute operations
 * 
 * @example
 * ```bash
 * # Check a dispute
 * kara-dispute get 1
 * 
 * # List recent disputes
 * kara-dispute list --limit 10
 * 
 * # Check escrow
 * kara-dispute escrow 0x123...
 * 
 * # Get voting status
 * kara-dispute votes 1
 * ```
 */

import { parseArgs } from 'util';
import { formatEther, parseEther, type Address } from 'viem';
import { KaraDispute } from './client';
import { DisputeStatus, Ruling } from './types';

// ============ Helpers ============

function formatStatus(status: number): string {
  const statuses: Record<number, string> = {
    [DisputeStatus.None]: '⬜ None',
    [DisputeStatus.Open]: '🆕 Open',
    [DisputeStatus.Voting]: '🗳️  Voting',
    [DisputeStatus.Resolved]: '✅ Resolved',
    [DisputeStatus.Appealed]: '⚖️  Appealed',
  };
  return statuses[status] || `Unknown (${status})`;
}

function formatRuling(ruling: number): string {
  const rulings: Record<number, string> = {
    [Ruling.RefusedToArbitrate]: '🚫 Refused',
    [Ruling.Claimant]: '👤 Claimant Wins',
    [Ruling.Respondent]: '👥 Respondent Wins',
  };
  return rulings[ruling] || `Unknown (${ruling})`;
}

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTimestamp(ts: bigint | number): string {
  const date = new Date(Number(ts) * 1000);
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

// ============ Commands ============

async function getDispute(client: KaraDispute, id: bigint) {
  console.log(`\n🔍 Fetching dispute #${id}...\n`);
  
  try {
    const dispute = await client.getDispute(id);
    
    console.log('═══════════════════════════════════════');
    console.log(`  DISPUTE #${dispute.id.toString()}`);
    console.log('═══════════════════════════════════════');
    console.log(`  Status:     ${formatStatus(dispute.status)}`);
    console.log(`  Amount:     ${formatEther(dispute.amount)} ETH`);
    console.log(`  Claimant:   ${formatAddress(dispute.claimant)}`);
    console.log(`  Respondent: ${formatAddress(dispute.respondent)}`);
    console.log(`  Created:    ${formatTimestamp(dispute.createdAt)}`);
    console.log(`  Deadline:   ${formatTimestamp(dispute.votingDeadline)}`);
    console.log(`  Ruling:     ${formatRuling(dispute.ruling)}`);
    console.log('═══════════════════════════════════════\n');
    
    if (dispute.evidenceURI) {
      console.log(`📎 Evidence: ${dispute.evidenceURI}`);
    }
    
  } catch (error: any) {
    console.error(`❌ Failed to fetch dispute: ${error.message}`);
    process.exit(1);
  }
}

async function getEscrow(client: KaraDispute, escrowId: string) {
  const id = BigInt(escrowId);
  console.log(`\n🔍 Fetching escrow #${id}...\n`);
  
  try {
    const escrow = await client.getEscrowTransaction(id);
    
    const statusLabels: Record<number, string> = {
      0: '⬜ None',
      1: '🆕 Created',
      2: '💰 Funded',
      3: '⚠️ Disputed',
      4: '✅ Resolved',
      5: '❌ Cancelled',
    };
    
    console.log('═══════════════════════════════════════');
    console.log(`  ESCROW #${escrow.id}`);
    console.log('═══════════════════════════════════════');
    console.log(`  Status:    ${statusLabels[escrow.status] || `Unknown (${escrow.status})`}`);
    console.log(`  Amount:    ${formatEther(escrow.amount)} ETH`);
    console.log(`  Payer:     ${formatAddress(escrow.payer)}`);
    console.log(`  Payee:     ${formatAddress(escrow.payee)}`);
    console.log(`  Created:   ${formatTimestamp(escrow.createdAt)}`);
    console.log(`  Deadline:  ${formatTimestamp(escrow.deadline)}`);
    console.log('═══════════════════════════════════════\n');
    
    if (escrow.disputeId > 0n) {
      console.log(`⚖️  Linked to Dispute #${escrow.disputeId}`);
    }
    
  } catch (error: any) {
    console.error(`❌ Failed to fetch escrow: ${error.message}`);
    process.exit(1);
  }
}

async function getVotes(client: KaraDispute, disputeId: bigint) {
  console.log(`\n🗳️  Fetching votes for dispute #${disputeId}...\n`);
  
  try {
    const result = await client.getVoteResult(disputeId);
    const total = result.forClaimant + result.forRespondent + result.abstained;
    
    console.log('═══════════════════════════════════════');
    console.log(`  VOTES FOR DISPUTE #${disputeId}`);
    console.log('═══════════════════════════════════════');
    console.log(`  For Claimant:   ${result.forClaimant} votes`);
    console.log(`  For Respondent: ${result.forRespondent} votes`);
    console.log(`  Abstained:      ${result.abstained} votes`);
    console.log(`  ─────────────────────────────────────`);
    console.log(`  Total:          ${total} votes`);
    console.log(`  Voters:         ${result.agentIds.length} agents`);
    console.log('═══════════════════════════════════════\n');
    
    if (total > 0n) {
      const claimantPct = Number(result.forClaimant * 100n / total);
      const respondentPct = Number(result.forRespondent * 100n / total);
      const abstainedPct = Number(result.abstained * 100n / total);
      
      console.log('📊 Distribution:');
      console.log(`   Claimant:   ${'█'.repeat(Math.round(claimantPct / 5))} ${claimantPct}%`);
      console.log(`   Respondent: ${'█'.repeat(Math.round(respondentPct / 5))} ${respondentPct}%`);
      console.log(`   Abstained:  ${'█'.repeat(Math.round(abstainedPct / 5))} ${abstainedPct}%`);
    }
    
  } catch (error: any) {
    console.error(`❌ Failed to fetch votes: ${error.message}`);
    process.exit(1);
  }
}

async function checkBalance(client: KaraDispute, address: string) {
  console.log(`\n💰 Checking KARA balance for ${formatAddress(address)}...\n`);
  
  try {
    const balance = await client.getKaraBalance(address as Address);
    const discount = client.calculateDiscount(balance);
    
    console.log('═══════════════════════════════════════');
    console.log(`  KARA BALANCE`);
    console.log('═══════════════════════════════════════');
    console.log(`  Address:  ${formatAddress(address)}`);
    console.log(`  Balance:  ${formatEther(balance)} KARA`);
    console.log(`  Discount: ${discount / 100}%`);
    console.log('═══════════════════════════════════════\n');
    
    // Tier info
    const tiers = [
      { name: 'Tier 1', threshold: parseEther('1000'), discount: '5%' },
      { name: 'Tier 2', threshold: parseEther('10000'), discount: '10%' },
      { name: 'Tier 3', threshold: parseEther('100000'), discount: '20%' },
      { name: 'Tier 4', threshold: parseEther('1000000'), discount: '30%' },
    ];
    
    console.log('📈 Tier Progress:');
    for (const tier of tiers) {
      const reached = balance >= tier.threshold;
      console.log(`   ${reached ? '✅' : '⬜'} ${tier.name} (${tier.discount}): ${formatEther(tier.threshold)} KARA`);
    }
    
  } catch (error: any) {
    console.error(`❌ Failed to check balance: ${error.message}`);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                  KARADISPUTE CLI                       ║
╚═══════════════════════════════════════════════════════╝

Usage: kara-dispute <command> [options]

Commands:
  get <id>              Get dispute details by ID
  escrow <hash>         Get escrow transaction details  
  votes <id>            Get voting status for a dispute
  balance <address>     Check KARA balance and tier
  help                  Show this help message

Options:
  --chain <chain>       Chain to use (base, base-sepolia) [default: base]
  --rpc <url>           Custom RPC URL

Examples:
  kara-dispute get 1
  kara-dispute escrow 0x1234...
  kara-dispute votes 5 --chain base-sepolia
  kara-dispute balance 0xabc... 
`);
}

// ============ Main ============

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      chain: { type: 'string', default: 'base' },
      rpc: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    showHelp();
    return;
  }

  const [command, ...args] = positionals;
  const chain = (values.chain === 'base-sepolia' ? 'base-sepolia' : 'base') as 'base' | 'base-sepolia';
  
  const client = new KaraDispute({
    chain,
    rpcUrl: values.rpc,
  });

  switch (command) {
    case 'get':
      if (!args[0]) {
        console.error('❌ Usage: kara-dispute get <dispute-id>');
        process.exit(1);
      }
      await getDispute(client, BigInt(args[0]));
      break;
      
    case 'escrow':
      if (!args[0]) {
        console.error('❌ Usage: kara-dispute escrow <escrow-hash>');
        process.exit(1);
      }
      await getEscrow(client, args[0]);
      break;
      
    case 'votes':
      if (!args[0]) {
        console.error('❌ Usage: kara-dispute votes <dispute-id>');
        process.exit(1);
      }
      await getVotes(client, BigInt(args[0]));
      break;
      
    case 'balance':
      if (!args[0]) {
        console.error('❌ Usage: kara-dispute balance <address>');
        process.exit(1);
      }
      await checkBalance(client, args[0]);
      break;
      
    case 'help':
      showHelp();
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
