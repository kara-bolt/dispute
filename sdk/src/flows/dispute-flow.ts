/**
 * DisputeFlow - Simple dispute creation for agents
 * @module @kara/dispute-sdk/flows
 * 
 * Dead-simple dispute creation. One method, done.
 * 
 * @example
 * ```typescript
 * import { DisputeFlow } from '@kara/dispute-sdk';
 * 
 * const flow = new DisputeFlow({ chain: 'base', wallet });
 * 
 * // One-liner dispute creation
 * const { disputeId } = await flow.createDispute({
 *   against: '0xBadActor...',
 *   amount: parseEther('0.5'),
 *   reason: 'service_not_delivered',
 *   description: 'Agent did not complete the agreed task',
 * });
 * ```
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  type Address,
  type Hash,
  type WalletClient,
  type Account,
  type Chain,
  type Transport,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';

import { KaraDispute, KaraDisputeWriter } from '../client';
import type { Dispute, DisputeStatus, EscrowTransaction } from '../types';
import { 
  type DisputeReason, 
  type Evidence,
  DISPUTE_TEMPLATES, 
  QuickEvidence,
  buildEvidence,
} from './templates';

// ============ Types ============

export interface DisputeFlowConfig {
  /** Chain to use */
  chain: 'base' | 'base-sepolia';
  
  /** Wallet client (required for write operations) */
  wallet?: WalletClient<Transport, Chain, Account>;
  
  /** Private key (alternative to wallet) */
  privateKey?: `0x${string}`;
  
  /** Custom RPC URL */
  rpcUrl?: string;
  
  /** Auto-approve KARA spending (default: true) */
  autoApproveKara?: boolean;
}

export interface SimpleDisputeParams {
  /** Address to dispute against */
  against: Address;
  
  /** Amount at stake (in wei) */
  amount: bigint;
  
  /** Dispute reason (uses template) */
  reason: DisputeReason;
  
  /** Description (overrides template default) */
  description?: string;
  
  /** Additional evidence details */
  details?: Record<string, unknown>;
  
  /** Pay with KARA token for discount */
  payWithKara?: boolean;
}

export interface SimpleEscrowDisputeParams {
  /** Escrow transaction ID to dispute */
  escrowId: bigint;
  
  /** Dispute reason */
  reason: DisputeReason;
  
  /** Description */
  description?: string;
  
  /** Additional evidence */
  details?: Record<string, unknown>;
}

export interface DisputeResult {
  /** Dispute ID on-chain */
  disputeId: bigint;
  
  /** Transaction hash */
  txHash: Hash;
  
  /** Evidence URI (IPFS or data URL) */
  evidenceUri: string;
  
  /** Voting deadline */
  votingDeadline: Date;
  
  /** Full dispute object */
  dispute: Dispute;
}

export interface EscrowDisputeResult extends DisputeResult {
  /** Original escrow transaction */
  escrow: EscrowTransaction;
}

export interface FlowStatus {
  /** Current dispute status */
  status: DisputeStatus;
  
  /** Status as human-readable string */
  statusText: string;
  
  /** Whether voting is still open */
  votingOpen: boolean;
  
  /** Time remaining for voting (seconds) */
  votingTimeRemaining: number;
  
  /** Current vote counts */
  votes: {
    forClaimant: bigint;
    forRespondent: bigint;
    abstained: bigint;
  };
  
  /** Ruling if resolved */
  ruling?: 'claimant' | 'respondent' | 'refused';
}

// ============ Main Flow Class ============

/**
 * DisputeFlow - Simplified dispute creation for AI agents
 * 
 * Wraps KaraDispute SDK with template-based evidence building
 * and dead-simple one-liner methods.
 */
export class DisputeFlow {
  private client: KaraDispute;
  private writer?: KaraDisputeWriter;
  private autoApproveKara: boolean;
  
  constructor(config: DisputeFlowConfig) {
    this.client = new KaraDispute({
      chain: config.chain,
      rpcUrl: config.rpcUrl,
    });
    
    this.autoApproveKara = config.autoApproveKara ?? true;
    
    // Set up wallet if provided
    if (config.wallet) {
      this.writer = this.client.withWallet(config.wallet);
    } else if (config.privateKey) {
      const chain = config.chain === 'base' ? base : baseSepolia;
      const wallet = createWalletClient({
        account: privateKeyToAccount(config.privateKey),
        chain,
        transport: http(config.rpcUrl),
      });
      this.writer = this.client.withWallet(wallet);
    }
  }
  
  /**
   * Get the wallet address
   */
  get address(): Address | undefined {
    return this.writer?.walletClient.account?.address;
  }
  
  /**
   * Check if write operations are available
   */
  get canWrite(): boolean {
    return !!this.writer;
  }
  
  // ============ One-Liner Dispute Creation ============
  
  /**
   * Create a dispute with minimal params
   * 
   * @example
   * ```typescript
   * const { disputeId } = await flow.createDispute({
   *   against: '0xBadActor...',
   *   amount: parseEther('0.5'),
   *   reason: 'service_not_delivered',
   *   description: 'Did not complete task by deadline',
   * });
   * ```
   */
  async createDispute(params: SimpleDisputeParams): Promise<DisputeResult> {
    if (!this.writer) {
      throw new Error('Wallet required for createDispute. Pass wallet or privateKey to constructor.');
    }
    
    const myAddress = this.writer.walletClient.account!.address;
    const template = DISPUTE_TEMPLATES[params.reason];
    
    // Build evidence
    const evidence = buildEvidence({
      type: params.reason,
      claimant: myAddress,
      respondent: params.against,
      amount: params.amount,
      description: params.description || template.description,
      details: params.details,
    });
    
    // Create evidence URI (data URL for simplicity - could be IPFS)
    const evidenceUri = this.createEvidenceUri(evidence);
    
    // Create the dispute
    const result = await this.writer.agentCreateDispute({
      counterparty: params.against,
      amount: params.amount,
      description: params.description || template.description,
      evidence: evidence.details,
    });
    
    // Fetch full dispute info
    const dispute = await this.client.getDispute(result.disputeId);
    
    return {
      disputeId: result.disputeId,
      txHash: result.receipt.hash,
      evidenceUri,
      votingDeadline: new Date(Number(dispute.votingDeadline) * 1000),
      dispute,
    };
  }
  
  /**
   * Dispute an existing escrow transaction
   * 
   * @example
   * ```typescript
   * const { disputeId } = await flow.disputeEscrow({
   *   escrowId: 123n,
   *   reason: 'quality_issues',
   *   description: 'Code has critical bugs',
   * });
   * ```
   */
  async disputeEscrow(params: SimpleEscrowDisputeParams): Promise<EscrowDisputeResult> {
    if (!this.writer) {
      throw new Error('Wallet required for disputeEscrow. Pass wallet or privateKey to constructor.');
    }
    
    // Get escrow details first
    const escrow = await this.client.getTransaction(params.escrowId);
    if (!escrow) {
      throw new Error(`Escrow ${params.escrowId} not found`);
    }
    
    const myAddress = this.writer.walletClient.account!.address;
    const template = DISPUTE_TEMPLATES[params.reason];
    
    // Build evidence
    const evidence = buildEvidence({
      type: params.reason,
      claimant: myAddress,
      respondent: myAddress === escrow.payer ? escrow.payee : escrow.payer,
      amount: escrow.amount,
      description: params.description || template.description,
      details: {
        escrowId: params.escrowId.toString(),
        ...params.details,
      },
    });
    
    const evidenceUri = this.createEvidenceUri(evidence);
    
    // Raise dispute on escrow
    const result = await this.writer.raiseDispute({
      transactionId: params.escrowId,
      evidenceURI: evidenceUri,
    });
    
    // Fetch full dispute info
    const dispute = await this.client.getDispute(result.disputeId);
    
    return {
      disputeId: result.disputeId,
      txHash: result.receipt.hash,
      evidenceUri,
      votingDeadline: new Date(Number(dispute.votingDeadline) * 1000),
      dispute,
      escrow,
    };
  }
  
  // ============ Quick Dispute Methods ============
  
  /**
   * Quick dispute: Service not delivered
   */
  async disputeServiceNotDelivered(params: {
    against: Address;
    amount: bigint;
    serviceDescription: string;
    deadline: Date;
    paymentTxHash?: string;
  }): Promise<DisputeResult> {
    const evidence = QuickEvidence.serviceNotDelivered({
      claimant: this.address!,
      respondent: params.against,
      amount: params.amount,
      serviceDescription: params.serviceDescription,
      deadline: params.deadline,
      paymentTxHash: params.paymentTxHash,
    });
    
    return this.createDispute({
      against: params.against,
      amount: params.amount,
      reason: 'service_not_delivered',
      description: evidence.description,
      details: evidence.details,
    });
  }
  
  /**
   * Quick dispute: Quality issues
   */
  async disputeQualityIssues(params: {
    against: Address;
    amount: bigint;
    issues: string[];
    deliveredWorkHash?: string;
  }): Promise<DisputeResult> {
    const evidence = QuickEvidence.qualityIssues({
      claimant: this.address!,
      respondent: params.against,
      amount: params.amount,
      issues: params.issues,
      deliveredWorkHash: params.deliveredWorkHash,
    });
    
    return this.createDispute({
      against: params.against,
      amount: params.amount,
      reason: 'quality_issues',
      description: evidence.description,
      details: evidence.details,
    });
  }
  
  /**
   * Quick dispute: Partial delivery
   */
  async disputePartialDelivery(params: {
    against: Address;
    amount: bigint;
    deliveredPercentage: number;
    missingItems: string[];
  }): Promise<DisputeResult> {
    const evidence = QuickEvidence.partialDelivery({
      claimant: this.address!,
      respondent: params.against,
      amount: params.amount,
      deliveredPercentage: params.deliveredPercentage,
      missingItems: params.missingItems,
    });
    
    return this.createDispute({
      against: params.against,
      amount: params.amount,
      reason: 'partial_delivery',
      description: evidence.description,
      details: evidence.details,
    });
  }
  
  // ============ Status & Monitoring ============
  
  /**
   * Get dispute status with human-readable info
   */
  async getStatus(disputeId: bigint): Promise<FlowStatus> {
    const dispute = await this.client.getDispute(disputeId);
    const votes = await this.client.getVotes(disputeId);
    
    const now = Math.floor(Date.now() / 1000);
    const deadline = Number(dispute.votingDeadline);
    const votingTimeRemaining = Math.max(0, deadline - now);
    
    const statusMap: Record<number, string> = {
      0: 'None',
      1: 'Open',
      2: 'Voting',
      3: 'Resolved',
      4: 'Appealed',
    };
    
    const rulingMap: Record<number, 'claimant' | 'respondent' | 'refused'> = {
      0: 'refused',
      1: 'claimant',
      2: 'respondent',
    };
    
    return {
      status: dispute.status,
      statusText: statusMap[dispute.status] || 'Unknown',
      votingOpen: dispute.status === 2 && votingTimeRemaining > 0,
      votingTimeRemaining,
      votes: {
        forClaimant: votes.forClaimant,
        forRespondent: votes.forRespondent,
        abstained: votes.abstained,
      },
      ruling: dispute.status === 3 ? rulingMap[dispute.ruling] : undefined,
    };
  }
  
  /**
   * Wait for dispute resolution
   */
  async waitForResolution(
    disputeId: bigint, 
    options?: { pollIntervalMs?: number; timeoutMs?: number }
  ): Promise<FlowStatus> {
    const pollInterval = options?.pollIntervalMs || 30_000;
    const timeout = options?.timeoutMs || 7 * 24 * 60 * 60 * 1000; // 7 days
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.getStatus(disputeId);
      
      if (status.status === 3 || status.status === 4) { // Resolved or Appealed
        return status;
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error(`Timeout waiting for dispute ${disputeId} resolution`);
  }
  
  // ============ Utilities ============
  
  /**
   * Create evidence URI from evidence object
   * Uses data URL for simplicity - production should use IPFS
   */
  private createEvidenceUri(evidence: Evidence): string {
    const json = JSON.stringify(evidence);
    const base64 = Buffer.from(json).toString('base64');
    return `data:application/json;base64,${base64}`;
  }
  
  /**
   * Get available dispute templates
   */
  static getTemplates(): typeof DISPUTE_TEMPLATES {
    return DISPUTE_TEMPLATES;
  }
  
  /**
   * Format amount for display
   */
  static formatAmount(wei: bigint): string {
    return formatEther(wei);
  }
  
  /**
   * Parse ETH amount to wei
   */
  static parseAmount(eth: string): bigint {
    return parseEther(eth);
  }
}
