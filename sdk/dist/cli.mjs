#!/usr/bin/env node
import {
  KaraDispute
} from "./chunk-M7IJODBS.mjs";

// src/cli.ts
import { parseArgs } from "util";
import { formatEther, parseEther } from "viem";
function formatStatus(status) {
  const statuses = {
    [0 /* None */]: "\u2B1C None",
    [1 /* Open */]: "\u{1F195} Open",
    [2 /* Voting */]: "\u{1F5F3}\uFE0F  Voting",
    [3 /* Resolved */]: "\u2705 Resolved",
    [4 /* Appealed */]: "\u2696\uFE0F  Appealed"
  };
  return statuses[status] || `Unknown (${status})`;
}
function formatRuling(ruling) {
  const rulings = {
    [0 /* RefusedToArbitrate */]: "\u{1F6AB} Refused",
    [1 /* Claimant */]: "\u{1F464} Claimant Wins",
    [2 /* Respondent */]: "\u{1F465} Respondent Wins"
  };
  return rulings[ruling] || `Unknown (${ruling})`;
}
function formatAddress(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
function formatTimestamp(ts) {
  const date = new Date(Number(ts) * 1e3);
  return date.toISOString().replace("T", " ").slice(0, 19);
}
async function getDispute(client, id) {
  console.log(`
\u{1F50D} Fetching dispute #${id}...
`);
  try {
    const dispute = await client.getDispute(id);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  DISPUTE #${dispute.id.toString()}`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  Status:     ${formatStatus(dispute.status)}`);
    console.log(`  Amount:     ${formatEther(dispute.amount)} ETH`);
    console.log(`  Claimant:   ${formatAddress(dispute.claimant)}`);
    console.log(`  Respondent: ${formatAddress(dispute.respondent)}`);
    console.log(`  Created:    ${formatTimestamp(dispute.createdAt)}`);
    console.log(`  Deadline:   ${formatTimestamp(dispute.votingDeadline)}`);
    console.log(`  Ruling:     ${formatRuling(dispute.ruling)}`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
    if (dispute.evidenceURI) {
      console.log(`\u{1F4CE} Evidence: ${dispute.evidenceURI}`);
    }
  } catch (error) {
    console.error(`\u274C Failed to fetch dispute: ${error.message}`);
    process.exit(1);
  }
}
async function getEscrow(client, escrowId) {
  const id = BigInt(escrowId);
  console.log(`
\u{1F50D} Fetching escrow #${id}...
`);
  try {
    const escrow = await client.getEscrowTransaction(id);
    const statusLabels = {
      0: "\u2B1C None",
      1: "\u{1F195} Created",
      2: "\u{1F4B0} Funded",
      3: "\u26A0\uFE0F Disputed",
      4: "\u2705 Resolved",
      5: "\u274C Cancelled"
    };
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  ESCROW #${escrow.id}`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  Status:    ${statusLabels[escrow.status] || `Unknown (${escrow.status})`}`);
    console.log(`  Amount:    ${formatEther(escrow.amount)} ETH`);
    console.log(`  Payer:     ${formatAddress(escrow.payer)}`);
    console.log(`  Payee:     ${formatAddress(escrow.payee)}`);
    console.log(`  Created:   ${formatTimestamp(escrow.createdAt)}`);
    console.log(`  Deadline:  ${formatTimestamp(escrow.deadline)}`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
    if (escrow.disputeId > 0n) {
      console.log(`\u2696\uFE0F  Linked to Dispute #${escrow.disputeId}`);
    }
  } catch (error) {
    console.error(`\u274C Failed to fetch escrow: ${error.message}`);
    process.exit(1);
  }
}
async function getVotes(client, disputeId) {
  console.log(`
\u{1F5F3}\uFE0F  Fetching votes for dispute #${disputeId}...
`);
  try {
    const result = await client.getVoteResult(disputeId);
    const total = result.forClaimant + result.forRespondent + result.abstained;
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  VOTES FOR DISPUTE #${disputeId}`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  For Claimant:   ${result.forClaimant} votes`);
    console.log(`  For Respondent: ${result.forRespondent} votes`);
    console.log(`  Abstained:      ${result.abstained} votes`);
    console.log(`  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`);
    console.log(`  Total:          ${total} votes`);
    console.log(`  Voters:         ${result.agentIds.length} agents`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
    if (total > 0n) {
      const claimantPct = Number(result.forClaimant * 100n / total);
      const respondentPct = Number(result.forRespondent * 100n / total);
      const abstainedPct = Number(result.abstained * 100n / total);
      console.log("\u{1F4CA} Distribution:");
      console.log(`   Claimant:   ${"\u2588".repeat(Math.round(claimantPct / 5))} ${claimantPct}%`);
      console.log(`   Respondent: ${"\u2588".repeat(Math.round(respondentPct / 5))} ${respondentPct}%`);
      console.log(`   Abstained:  ${"\u2588".repeat(Math.round(abstainedPct / 5))} ${abstainedPct}%`);
    }
  } catch (error) {
    console.error(`\u274C Failed to fetch votes: ${error.message}`);
    process.exit(1);
  }
}
async function checkBalance(client, address) {
  console.log(`
\u{1F4B0} Checking KARA balance for ${formatAddress(address)}...
`);
  try {
    const balance = await client.getKaraBalance(address);
    const discount = client.calculateDiscount(balance);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  KARA BALANCE`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
    console.log(`  Address:  ${formatAddress(address)}`);
    console.log(`  Balance:  ${formatEther(balance)} KARA`);
    console.log(`  Discount: ${discount / 100}%`);
    console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
    const tiers = [
      { name: "Tier 1", threshold: parseEther("1000"), discount: "5%" },
      { name: "Tier 2", threshold: parseEther("10000"), discount: "10%" },
      { name: "Tier 3", threshold: parseEther("100000"), discount: "20%" },
      { name: "Tier 4", threshold: parseEther("1000000"), discount: "30%" }
    ];
    console.log("\u{1F4C8} Tier Progress:");
    for (const tier of tiers) {
      const reached = balance >= tier.threshold;
      console.log(`   ${reached ? "\u2705" : "\u2B1C"} ${tier.name} (${tier.discount}): ${formatEther(tier.threshold)} KARA`);
    }
  } catch (error) {
    console.error(`\u274C Failed to check balance: ${error.message}`);
    process.exit(1);
  }
}
function showHelp() {
  console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551                  KARADISPUTE CLI                       \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

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
async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      chain: { type: "string", default: "base" },
      rpc: { type: "string" },
      help: { type: "boolean", short: "h" }
    },
    allowPositionals: true
  });
  if (values.help || positionals.length === 0) {
    showHelp();
    return;
  }
  const [command, ...args] = positionals;
  const chain = values.chain === "base-sepolia" ? "base-sepolia" : "base";
  const client = new KaraDispute({
    chain,
    rpcUrl: values.rpc
  });
  switch (command) {
    case "get":
      if (!args[0]) {
        console.error("\u274C Usage: kara-dispute get <dispute-id>");
        process.exit(1);
      }
      await getDispute(client, BigInt(args[0]));
      break;
    case "escrow":
      if (!args[0]) {
        console.error("\u274C Usage: kara-dispute escrow <escrow-hash>");
        process.exit(1);
      }
      await getEscrow(client, args[0]);
      break;
    case "votes":
      if (!args[0]) {
        console.error("\u274C Usage: kara-dispute votes <dispute-id>");
        process.exit(1);
      }
      await getVotes(client, BigInt(args[0]));
      break;
    case "balance":
      if (!args[0]) {
        console.error("\u274C Usage: kara-dispute balance <address>");
        process.exit(1);
      }
      await checkBalance(client, args[0]);
      break;
    case "help":
      showHelp();
      break;
    default:
      console.error(`\u274C Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}
main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
