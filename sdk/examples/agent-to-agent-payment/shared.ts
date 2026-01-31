/**
 * Shared types and configuration for agent-to-agent payments
 */

import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

// ============================================================================
// Types
// ============================================================================

export interface JobSpec {
  /** Seller's wallet address */
  seller: Address;
  /** Payment amount in token units (e.g., "10" for 10 USDC) */
  amount: string;
  /** Job description / requirements */
  description: string;
  /** Deadline in seconds from now */
  deadline: number;
  /** Optional: specific deliverables */
  deliverables?: string[];
  /** Optional: payment token (defaults to ETH) */
  token?: Address;
}

export interface JobResult {
  /** Unique escrow/job ID */
  escrowId: bigint;
  /** IPFS hash or URL of work output */
  outputHash: string;
  /** Summary of completed work */
  summary: string;
  /** Completion timestamp */
  completedAt: number;
  /** Optional: quality score self-assessment (0-100) */
  qualityScore?: number;
}

export interface DisputeEvidence {
  /** Dispute ID on KaraDispute */
  disputeId: bigint;
  /** Title of evidence */
  title: string;
  /** Evidence content or IPFS hash */
  content: string;
  /** Supporting documents/links */
  attachments?: string[];
}

export type JobStatus = 
  | 'pending'     // Created, waiting for seller
  | 'accepted'    // Seller accepted
  | 'completed'   // Seller submitted work
  | 'released'    // Buyer released payment
  | 'disputed'    // Under dispute
  | 'resolved'    // Dispute resolved
  | 'expired'     // Deadline passed, no action
  | 'refunded';   // Funds returned to buyer

export interface EscrowState {
  id: bigint;
  buyer: Address;
  seller: Address;
  amount: bigint;
  token: Address;
  deadline: bigint;
  status: JobStatus;
  workSubmission?: string;
  disputeId?: bigint;
}

// ============================================================================
// Configuration
// ============================================================================

export const CONFIG = {
  // Chain configuration
  chain: process.env.CHAIN === 'testnet' ? baseSepolia : base,
  rpcUrl: process.env.RPC_URL || 'https://mainnet.base.org',
  
  // Contract addresses (Base mainnet)
  contracts: {
    karaDispute: '0x7d4E0dDa7dce8Ed879a40CdC7D65d87e83Cb9f61' as Address,
    karaToken: '0x99926046978e9fB6544140982fB32cddC7e86b07' as Address,
    karaPay: '0x0000000000000000000000000000000000000000' as Address, // TODO: deploy
  },
  
  // Default values
  defaults: {
    deadline: 24 * 60 * 60,        // 24 hours
    minDeadline: 60 * 60,          // 1 hour minimum
    maxDeadline: 30 * 24 * 60 * 60, // 30 days maximum
  },
  
  // Arbitration fees (in wei)
  arbitrationBaseFee: 1_000_000_000_000_000n, // 0.001 ETH
} as const;

// ============================================================================
// Client Factory
// ============================================================================

/**
 * Create a public client for read operations
 */
export function createReader() {
  return createPublicClient({
    chain: CONFIG.chain,
    transport: http(CONFIG.rpcUrl),
  });
}

/**
 * Create a wallet client for write operations
 */
export function createSigner(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: CONFIG.chain,
    transport: http(CONFIG.rpcUrl),
  });
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format amount for display (assumes 18 decimals)
 */
export function formatAmount(wei: bigint, decimals = 18): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = wei / divisor;
  const fraction = wei % divisor;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
}

/**
 * Parse amount from string (assumes 18 decimals)
 */
export function parseAmount(amount: string, decimals = 18): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

/**
 * Generate a simple hash for content (for demo purposes)
 */
export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `ipfs://Qm${Math.abs(hash).toString(16).padStart(44, '0')}`;
}

/**
 * Wait for a specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Log with timestamp and agent prefix
 */
export function log(agent: 'BUYER' | 'SELLER' | 'SYSTEM', message: string, data?: unknown) {
  const timestamp = new Date().toISOString().slice(11, 19);
  const prefix = {
    BUYER: '🛒',
    SELLER: '🔧',
    SYSTEM: '⚡',
  }[agent];
  
  console.log(`[${timestamp}] ${prefix} ${agent}: ${message}`);
  if (data) {
    console.log(JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
  }
}
