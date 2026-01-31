/**
 * Shared utilities for dispute flow examples
 */

import { KaraDispute, KaraDisputeWriter, DisputeStatus } from '@kara/dispute-sdk';
import { createWalletClient, http, parseEther, formatEther, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// ============ Config ============

export const CONFIG = {
  chain: 'base-sepolia' as const,
  rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
  privateKey: process.env.PRIVATE_KEY as `0x${string}` | undefined,
  
  // Demo addresses (replace in production)
  counterparty: '0x0000000000000000000000000000000000000001' as Address,
};

// ============ Client Setup ============

export function createReadOnlyClient(): KaraDispute {
  return new KaraDispute({
    chain: CONFIG.chain,
    rpcUrl: CONFIG.rpcUrl,
  });
}

export function createWriteClient(privateKey: `0x${string}`): KaraDisputeWriter {
  const account = privateKeyToAccount(privateKey);
  
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(CONFIG.rpcUrl),
  });

  const reader = createReadOnlyClient();
  return reader.withWallet(walletClient);
}

// ============ Evidence Helpers ============

export interface Evidence {
  title: string;
  description: string;
  timeline?: Array<{
    date: string;
    event: string;
    proof?: string | null;
  }>;
  attachments?: Array<{
    name: string;
    cid: string;
  }>;
  requestedOutcome: string;
  amount: string;
}

/**
 * Create a structured evidence object
 */
export function createEvidence(params: {
  title: string;
  description: string;
  amount: bigint;
  requestedOutcome: string;
  timeline?: Evidence['timeline'];
  attachments?: Evidence['attachments'];
}): Evidence {
  return {
    title: params.title,
    description: params.description,
    timeline: params.timeline || [],
    attachments: params.attachments || [],
    requestedOutcome: params.requestedOutcome,
    amount: params.amount.toString(),
  };
}

/**
 * Convert evidence to URI (placeholder - should pin to IPFS in production)
 */
export function evidenceToURI(evidence: Evidence): string {
  // In production, pin to IPFS and return ipfs:// URI
  // For demo, we'll use base64 encoded JSON
  const json = JSON.stringify(evidence);
  const base64 = Buffer.from(json).toString('base64');
  return `data:application/json;base64,${base64}`;
}

// ============ Status Helpers ============

export function statusToString(status: DisputeStatus): string {
  const names = ['None', 'Open', 'Voting', 'Resolved', 'Appealed'];
  return names[status] || 'Unknown';
}

export function rulingToString(ruling: number): string {
  const names = ['Refused to Arbitrate', 'Claimant Wins', 'Respondent Wins'];
  return names[ruling] || 'Unknown';
}

// ============ Polling Helper ============

export interface PollOptions {
  maxAttempts?: number;
  intervalMs?: number;
  onStatus?: (status: DisputeStatus, attempt: number) => void;
}

/**
 * Poll dispute until resolved or max attempts reached
 */
export async function pollUntilResolved(
  client: KaraDispute,
  disputeId: bigint,
  options: PollOptions = {}
): Promise<{ status: DisputeStatus; ruling: number; resolved: boolean }> {
  const maxAttempts = options.maxAttempts ?? 60; // 1 hour with 1min intervals
  const intervalMs = options.intervalMs ?? 60_000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const dispute = await client.getDispute(disputeId);
    
    options.onStatus?.(dispute.status, attempt);
    
    if (dispute.status === DisputeStatus.Resolved) {
      return {
        status: dispute.status,
        ruling: dispute.ruling,
        resolved: true,
      };
    }
    
    if (attempt < maxAttempts) {
      await sleep(intervalMs);
    }
  }
  
  const finalDispute = await client.getDispute(disputeId);
  return {
    status: finalDispute.status,
    ruling: finalDispute.ruling,
    resolved: finalDispute.status === DisputeStatus.Resolved,
  };
}

// ============ Utilities ============

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function log(message: string, data?: unknown): void {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`[${timestamp}] ${message}`);
  if (data !== undefined) {
    console.log(JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
  }
}

export { parseEther, formatEther };
