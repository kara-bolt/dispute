/**
 * KaraDispute SDK Types
 * @module @kara/dispute-sdk
 */

import type { Address, Hash } from 'viem';

// ============ Enums ============

export enum DisputeStatus {
  None = 0,
  Open = 1,
  Voting = 2,
  Resolved = 3,
  Appealed = 4,
}

export enum Ruling {
  RefusedToArbitrate = 0,
  Claimant = 1,
  Respondent = 2,
}

export enum TransactionStatus {
  None = 0,
  Created = 1,
  Funded = 2,
  Disputed = 3,
  Resolved = 4,
  Cancelled = 5,
}

// ============ Core Types ============

export interface Dispute {
  id: bigint;
  claimant: Address;
  respondent: Address;
  arbitrable: Address;
  amount: bigint;
  evidenceURI: string;
  status: DisputeStatus;
  ruling: Ruling;
  createdAt: bigint;
  resolvedAt: bigint;
  votingDeadline: bigint;
  appealRound: number;
  requiredVotes: bigint;
  karaFeePaid: bigint;
}

export interface VoteResult {
  forClaimant: bigint;
  forRespondent: bigint;
  abstained: bigint;
  agentIds: `0x${string}`[];
  signatures: `0x${string}`[];
}

export interface ArbitratorStake {
  amount: bigint;
  stakedAt: bigint;
  lockedUntil: bigint;
  slashedAmount: bigint;
  active: boolean;
}

export interface EscrowTransaction {
  id: bigint;
  payer: Address;
  payee: Address;
  token: Address;
  amount: bigint;
  status: TransactionStatus;
  disputeId: bigint;
  description: string;
  deadline: bigint;
  createdAt: bigint;
}

// ============ SDK Options ============

export interface KaraDisputeConfig {
  /** Chain to connect to */
  chain: 'base' | 'base-sepolia';
  
  /** Custom RPC URL (optional) */
  rpcUrl?: string;
  
  /** Contract addresses (auto-filled for known chains) */
  addresses?: {
    karaDispute?: Address;
    karaEscrow?: Address;
    karaPay?: Address;
    karaToken?: Address;
  };
}

export interface CreateEscrowParams {
  /** Recipient address */
  payee: Address;
  
  /** Token address (use zeroAddress for ETH) */
  token?: Address;
  
  /** Amount to escrow (in wei) */
  amount: bigint;
  
  /** Description of the transaction */
  description: string;
  
  /** Deadline for disputes (timestamp in seconds) */
  deadline: bigint;
}

export interface CreateDisputeParams {
  /** Claimant address (usually msg.sender) */
  claimant: Address;
  
  /** Respondent address */
  respondent: Address;
  
  /** Amount at stake */
  amount: bigint;
  
  /** IPFS URI or URL to evidence */
  evidenceURI: string;
  
  /** Pay with KARA token (default: true) */
  payWithKara?: boolean;
}

export interface RaiseDisputeParams {
  /** Transaction ID to dispute */
  transactionId: bigint;
  
  /** IPFS URI or URL to evidence */
  evidenceURI: string;
}

// ============ Response Types ============

export interface TransactionReceipt {
  hash: Hash;
  blockNumber: bigint;
  status: 'success' | 'reverted';
}

export interface DisputeCreatedResult {
  disputeId: bigint;
  receipt: TransactionReceipt;
}

export interface EscrowCreatedResult {
  transactionId: bigint;
  receipt: TransactionReceipt;
}

// ============ Agent Integration Types ============

/**
 * Simplified interface for AI agents to interact with KaraDispute
 */
export interface AgentDisputeRequest {
  /** Agent's wallet address */
  from: Address;
  
  /** Counterparty address */
  counterparty: Address;
  
  /** Amount in dispute (in wei) */
  amount: bigint;
  
  /** Plain text description */
  description: string;
  
  /** Evidence as JSON (will be pinned to IPFS) */
  evidence?: Record<string, unknown>;
}

export interface AgentEscrowRequest {
  /** Agent's wallet address (payer) */
  from: Address;
  
  /** Recipient address */
  to: Address;
  
  /** Amount (in wei) */
  amount: bigint;
  
  /** Token address (omit for ETH) */
  token?: Address;
  
  /** Description */
  description: string;
  
  /** Deadline in seconds from now (default: 7 days) */
  deadlineSeconds?: number;
}
