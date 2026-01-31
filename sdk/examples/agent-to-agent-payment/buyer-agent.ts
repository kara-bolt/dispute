/**
 * Buyer Agent (Agent A)
 * 
 * Creates escrow jobs, reviews work, releases payment or raises disputes.
 * This represents the agent that needs work done and is paying for it.
 */

import { type Address, encodeFunctionData, parseEther } from 'viem';
import { 
  createReader, 
  createSigner, 
  CONFIG, 
  type JobSpec, 
  type EscrowState,
  type JobStatus,
  log,
  parseAmount,
  formatAmount,
  hashContent,
} from './shared';

// Simplified KaraPay ABI (subset needed for buyer operations)
const KARA_PAY_ABI = [
  {
    name: 'createEscrow',
    type: 'function',
    inputs: [
      { name: 'seller', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'description', type: 'string' },
    ],
    outputs: [{ name: 'escrowId', type: 'uint256' }],
  },
  {
    name: 'releasePayment',
    type: 'function',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'raiseDispute',
    type: 'function',
    inputs: [
      { name: 'escrowId', type: 'uint256' },
      { name: 'reason', type: 'string' },
    ],
    outputs: [{ name: 'disputeId', type: 'uint256' }],
  },
  {
    name: 'getEscrow',
    type: 'function',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [
      { name: 'buyer', type: 'address' },
      { name: 'seller', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'workHash', type: 'string' },
      { name: 'disputeId', type: 'uint256' },
    ],
  },
] as const;

// Status mapping from contract enum
const STATUS_MAP: Record<number, JobStatus> = {
  0: 'pending',
  1: 'accepted',
  2: 'completed',
  3: 'released',
  4: 'disputed',
  5: 'resolved',
  6: 'expired',
  7: 'refunded',
};

/**
 * BuyerAgent - manages job creation and payment release
 */
export class BuyerAgent {
  private reader = createReader();
  private signer;
  public address: Address;

  constructor(privateKey: `0x${string}`) {
    this.signer = createSigner(privateKey);
    this.address = this.signer.account.address;
  }

  /**
   * Create a new escrow job for a seller to complete
   */
  async createJob(spec: JobSpec): Promise<bigint> {
    log('BUYER', `Creating job for seller ${spec.seller.slice(0, 10)}...`);
    
    // Validate inputs
    if (spec.deadline < CONFIG.defaults.minDeadline) {
      throw new Error(`Deadline too short. Minimum: ${CONFIG.defaults.minDeadline}s`);
    }
    if (spec.deadline > CONFIG.defaults.maxDeadline) {
      throw new Error(`Deadline too long. Maximum: ${CONFIG.defaults.maxDeadline}s`);
    }

    const amount = parseAmount(spec.amount);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + spec.deadline);
    const token = spec.token || '0x0000000000000000000000000000000000000000' as Address;

    // Build description with deliverables
    let description = spec.description;
    if (spec.deliverables?.length) {
      description += '\n\nDeliverables:\n' + spec.deliverables.map(d => `- ${d}`).join('\n');
    }

    log('BUYER', 'Job details:', {
      seller: spec.seller,
      amount: spec.amount,
      token: token === '0x0000000000000000000000000000000000000000' ? 'ETH' : token,
      deadline: new Date(Number(deadline) * 1000).toISOString(),
    });

    // In production, this would call the actual contract
    // For demo, we simulate the escrow creation
    if (CONFIG.contracts.karaPay === '0x0000000000000000000000000000000000000000') {
      // Simulation mode - KaraPay not deployed yet
      const mockEscrowId = BigInt(Math.floor(Math.random() * 1000000));
      log('BUYER', `[SIMULATED] Escrow created with ID: ${mockEscrowId}`);
      return mockEscrowId;
    }

    // Real transaction
    const hash = await this.signer.writeContract({
      address: CONFIG.contracts.karaPay,
      abi: KARA_PAY_ABI,
      functionName: 'createEscrow',
      args: [spec.seller, token, amount, deadline, description],
      value: token === '0x0000000000000000000000000000000000000000' ? amount : 0n,
    });

    log('BUYER', `Transaction submitted: ${hash}`);

    // Wait for confirmation and extract escrow ID
    const receipt = await this.reader.waitForTransactionReceipt({ hash });
    
    // Parse escrow ID from logs (simplified)
    const escrowId = BigInt(receipt.logs[0]?.topics[1] || 0);
    
    log('BUYER', `Escrow created! ID: ${escrowId}`);
    return escrowId;
  }

  /**
   * Check the current status of an escrow job
   */
  async getJobStatus(escrowId: bigint): Promise<EscrowState> {
    log('BUYER', `Checking status of escrow ${escrowId}`);

    if (CONFIG.contracts.karaPay === '0x0000000000000000000000000000000000000000') {
      // Simulation mode
      return {
        id: escrowId,
        buyer: this.address,
        seller: '0x0000000000000000000000000000000000000001' as Address,
        amount: parseAmount('10'),
        token: '0x0000000000000000000000000000000000000000' as Address,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
        status: 'pending',
      };
    }

    const result = await this.reader.readContract({
      address: CONFIG.contracts.karaPay,
      abi: KARA_PAY_ABI,
      functionName: 'getEscrow',
      args: [escrowId],
    });

    const [buyer, seller, token, amount, deadline, statusCode, workHash, disputeId] = result;

    return {
      id: escrowId,
      buyer,
      seller,
      amount,
      token,
      deadline,
      status: STATUS_MAP[statusCode] || 'pending',
      workSubmission: workHash || undefined,
      disputeId: disputeId > 0n ? disputeId : undefined,
    };
  }

  /**
   * Review submitted work and decide whether to accept
   * Returns true if work meets requirements
   */
  async reviewWork(escrowId: bigint, customReviewFn?: (workHash: string) => Promise<boolean>): Promise<boolean> {
    log('BUYER', `Reviewing work for escrow ${escrowId}`);

    const state = await this.getJobStatus(escrowId);
    
    if (state.status !== 'completed') {
      log('BUYER', `Cannot review - status is ${state.status}, expected 'completed'`);
      return false;
    }

    if (!state.workSubmission) {
      log('BUYER', 'No work submission found');
      return false;
    }

    // Use custom review function if provided, otherwise auto-accept
    if (customReviewFn) {
      const accepted = await customReviewFn(state.workSubmission);
      log('BUYER', `Custom review result: ${accepted ? 'ACCEPTED' : 'REJECTED'}`);
      return accepted;
    }

    // Default: auto-accept (in production, implement actual review logic)
    log('BUYER', 'Auto-accepting work (no custom review function)');
    return true;
  }

  /**
   * Release payment to seller after satisfactory work
   */
  async releasePayment(escrowId: bigint): Promise<string> {
    log('BUYER', `Releasing payment for escrow ${escrowId}`);

    if (CONFIG.contracts.karaPay === '0x0000000000000000000000000000000000000000') {
      // Simulation mode
      const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
      log('BUYER', `[SIMULATED] Payment released! Tx: ${mockTxHash}`);
      return mockTxHash;
    }

    const hash = await this.signer.writeContract({
      address: CONFIG.contracts.karaPay,
      abi: KARA_PAY_ABI,
      functionName: 'releasePayment',
      args: [escrowId],
    });

    log('BUYER', `Payment released! Tx: ${hash}`);
    return hash;
  }

  /**
   * Raise a dispute if work is unsatisfactory
   */
  async raiseDispute(escrowId: bigint, reason: string): Promise<bigint> {
    log('BUYER', `Raising dispute for escrow ${escrowId}`);
    log('BUYER', `Reason: ${reason}`);

    if (CONFIG.contracts.karaPay === '0x0000000000000000000000000000000000000000') {
      // Simulation mode
      const mockDisputeId = BigInt(Math.floor(Math.random() * 100000));
      log('BUYER', `[SIMULATED] Dispute raised! ID: ${mockDisputeId}`);
      return mockDisputeId;
    }

    const hash = await this.signer.writeContract({
      address: CONFIG.contracts.karaPay,
      abi: KARA_PAY_ABI,
      functionName: 'raiseDispute',
      args: [escrowId, reason],
    });

    log('BUYER', `Dispute transaction: ${hash}`);

    const receipt = await this.reader.waitForTransactionReceipt({ hash });
    const disputeId = BigInt(receipt.logs[0]?.topics[1] || 0);

    log('BUYER', `Dispute created! ID: ${disputeId}`);
    return disputeId;
  }

  /**
   * Submit evidence for an ongoing dispute
   */
  async submitEvidence(disputeId: bigint, title: string, content: string): Promise<string> {
    log('BUYER', `Submitting evidence for dispute ${disputeId}`);
    
    // Hash the content for on-chain storage
    const evidenceHash = hashContent(content);
    
    // In production, upload to IPFS first, then submit hash
    log('BUYER', `Evidence hash: ${evidenceHash}`);
    log('BUYER', `[NOTE] In production, upload content to IPFS and submit hash to contract`);

    return evidenceHash;
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<bigint> {
    const balance = await this.reader.getBalance({ address: this.address });
    log('BUYER', `Balance: ${formatAmount(balance)} ETH`);
    return balance;
  }
}

// ============================================================================
// Example Usage
// ============================================================================

async function example() {
  // This would be called with a real private key
  const buyer = new BuyerAgent('0x' + '1'.repeat(64) as `0x${string}`);

  // Create a job
  const escrowId = await buyer.createJob({
    seller: '0x742d35Cc6634C0532925a3b844Bc9e7595f7DEAF' as Address,
    amount: '0.1',
    description: 'Analyze market data and provide trading signals',
    deadline: 24 * 60 * 60, // 24 hours
    deliverables: [
      'JSON file with 10 trading signals',
      'Confidence score for each signal',
      'Brief explanation of methodology',
    ],
  });

  console.log(`Created escrow: ${escrowId}`);

  // Check status
  const status = await buyer.getJobStatus(escrowId);
  console.log(`Status: ${status.status}`);

  // Review and release (if work is done)
  if (status.status === 'completed') {
    const accepted = await buyer.reviewWork(escrowId);
    if (accepted) {
      await buyer.releasePayment(escrowId);
    } else {
      await buyer.raiseDispute(escrowId, 'Work does not meet specifications');
    }
  }
}

// Run example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  example().catch(console.error);
}
