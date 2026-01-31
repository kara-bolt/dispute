/**
 * Seller Agent (Agent B)
 * 
 * Monitors for incoming jobs, accepts work, completes tasks, and claims payment.
 * This represents the agent that provides services and receives payment.
 */

import { type Address } from 'viem';
import { 
  createReader, 
  createSigner, 
  CONFIG, 
  type JobResult,
  type EscrowState,
  type JobStatus,
  log,
  formatAmount,
  hashContent,
  sleep,
} from './shared';

// Simplified KaraPay ABI (subset needed for seller operations)
const KARA_PAY_ABI = [
  {
    name: 'acceptJob',
    type: 'function',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'submitWork',
    type: 'function',
    inputs: [
      { name: 'escrowId', type: 'uint256' },
      { name: 'workHash', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'claimExpired',
    type: 'function',
    inputs: [{ name: 'escrowId', type: 'uint256' }],
    outputs: [],
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
  {
    name: 'getPendingJobsForSeller',
    type: 'function',
    inputs: [{ name: 'seller', type: 'address' }],
    outputs: [{ name: 'escrowIds', type: 'uint256[]' }],
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
 * SellerAgent - monitors jobs, completes work, claims payment
 */
export class SellerAgent {
  private reader = createReader();
  private signer;
  public address: Address;

  // Track active jobs
  private activeJobs: Map<string, EscrowState> = new Map();

  constructor(privateKey: `0x${string}`) {
    this.signer = createSigner(privateKey);
    this.address = this.signer.account.address;
  }

  /**
   * Scan for pending jobs assigned to this seller
   */
  async scanForJobs(): Promise<bigint[]> {
    log('SELLER', 'Scanning for pending jobs...');

    if (CONFIG.contracts.karaPay === '0x0000000000000000000000000000000000000000') {
      // Simulation mode - return mock jobs
      const mockJobs = [BigInt(Math.floor(Math.random() * 1000))];
      log('SELLER', `[SIMULATED] Found ${mockJobs.length} pending job(s)`);
      return mockJobs;
    }

    const escrowIds = await this.reader.readContract({
      address: CONFIG.contracts.karaPay,
      abi: KARA_PAY_ABI,
      functionName: 'getPendingJobsForSeller',
      args: [this.address],
    });

    log('SELLER', `Found ${escrowIds.length} pending job(s)`);
    return [...escrowIds];
  }

  /**
   * Get details of a specific job
   */
  async getJobDetails(escrowId: bigint): Promise<EscrowState> {
    log('SELLER', `Fetching details for escrow ${escrowId}`);

    if (CONFIG.contracts.karaPay === '0x0000000000000000000000000000000000000000') {
      // Simulation mode
      return {
        id: escrowId,
        buyer: '0x0000000000000000000000000000000000000001' as Address,
        seller: this.address,
        amount: 100000000000000000n, // 0.1 ETH
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
   * Accept a pending job
   */
  async acceptJob(escrowId: bigint): Promise<string> {
    log('SELLER', `Accepting job ${escrowId}`);

    const state = await this.getJobDetails(escrowId);
    
    if (state.status !== 'pending') {
      throw new Error(`Cannot accept job with status: ${state.status}`);
    }

    if (state.seller.toLowerCase() !== this.address.toLowerCase()) {
      throw new Error('This job is not assigned to this seller');
    }

    if (CONFIG.contracts.karaPay === '0x0000000000000000000000000000000000000000') {
      // Simulation mode
      const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
      log('SELLER', `[SIMULATED] Job accepted! Tx: ${mockTxHash}`);
      this.activeJobs.set(escrowId.toString(), { ...state, status: 'accepted' });
      return mockTxHash;
    }

    const hash = await this.signer.writeContract({
      address: CONFIG.contracts.karaPay,
      abi: KARA_PAY_ABI,
      functionName: 'acceptJob',
      args: [escrowId],
    });

    log('SELLER', `Job accepted! Tx: ${hash}`);
    this.activeJobs.set(escrowId.toString(), { ...state, status: 'accepted' });
    return hash;
  }

  /**
   * Perform the actual work (override this in your implementation)
   * This is a placeholder that simulates work being done
   */
  async doWork(jobDescription?: string): Promise<string> {
    log('SELLER', 'Performing work...');
    
    // Simulate work time
    await sleep(1000);

    // In a real implementation, this would:
    // - Parse the job description
    // - Execute the required task (API calls, analysis, etc.)
    // - Generate output in the required format

    const result = {
      status: 'completed',
      output: 'Work completed successfully',
      timestamp: new Date().toISOString(),
      details: jobDescription || 'Generic work output',
    };

    log('SELLER', 'Work completed!', result);
    return JSON.stringify(result);
  }

  /**
   * Submit completed work for a job
   */
  async submitWork(escrowId: bigint, result: string | JobResult): Promise<string> {
    log('SELLER', `Submitting work for escrow ${escrowId}`);

    // Convert to hash if needed
    const workHash = typeof result === 'string' 
      ? hashContent(result)
      : result.outputHash;

    log('SELLER', `Work hash: ${workHash}`);

    if (CONFIG.contracts.karaPay === '0x0000000000000000000000000000000000000000') {
      // Simulation mode
      const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
      log('SELLER', `[SIMULATED] Work submitted! Tx: ${mockTxHash}`);
      
      const state = this.activeJobs.get(escrowId.toString());
      if (state) {
        this.activeJobs.set(escrowId.toString(), { 
          ...state, 
          status: 'completed',
          workSubmission: workHash,
        });
      }
      return mockTxHash;
    }

    const hash = await this.signer.writeContract({
      address: CONFIG.contracts.karaPay,
      abi: KARA_PAY_ABI,
      functionName: 'submitWork',
      args: [escrowId, workHash],
    });

    log('SELLER', `Work submitted! Tx: ${hash}`);
    return hash;
  }

  /**
   * Claim payment for an expired escrow (buyer didn't respond)
   */
  async claimExpired(escrowId: bigint): Promise<string> {
    log('SELLER', `Claiming expired escrow ${escrowId}`);

    const state = await this.getJobDetails(escrowId);
    const now = BigInt(Math.floor(Date.now() / 1000));

    if (state.deadline > now) {
      throw new Error(`Escrow not yet expired. Deadline: ${new Date(Number(state.deadline) * 1000).toISOString()}`);
    }

    if (state.status !== 'completed') {
      throw new Error(`Cannot claim - status is ${state.status}, must be 'completed'`);
    }

    if (CONFIG.contracts.karaPay === '0x0000000000000000000000000000000000000000') {
      // Simulation mode
      const mockTxHash = `0x${Math.random().toString(16).slice(2, 66)}`;
      log('SELLER', `[SIMULATED] Expired escrow claimed! Tx: ${mockTxHash}`);
      return mockTxHash;
    }

    const hash = await this.signer.writeContract({
      address: CONFIG.contracts.karaPay,
      abi: KARA_PAY_ABI,
      functionName: 'claimExpired',
      args: [escrowId],
    });

    log('SELLER', `Expired escrow claimed! Tx: ${hash}`);
    return hash;
  }

  /**
   * Submit evidence for a dispute
   */
  async submitEvidence(disputeId: bigint, title: string, content: string): Promise<string> {
    log('SELLER', `Submitting evidence for dispute ${disputeId}`);

    const evidenceHash = hashContent(content);

    log('SELLER', `Evidence: ${title}`);
    log('SELLER', `Hash: ${evidenceHash}`);
    log('SELLER', `[NOTE] In production, upload to IPFS and submit hash to contract`);

    return evidenceHash;
  }

  /**
   * Monitor a job until completion or dispute
   */
  async monitorJob(escrowId: bigint, pollIntervalMs = 30000): Promise<JobStatus> {
    log('SELLER', `Starting to monitor escrow ${escrowId}`);

    const finalStatuses: JobStatus[] = ['released', 'resolved', 'expired', 'refunded'];

    while (true) {
      const state = await this.getJobDetails(escrowId);
      log('SELLER', `Current status: ${state.status}`);

      if (finalStatuses.includes(state.status)) {
        log('SELLER', `Job reached final status: ${state.status}`);
        return state.status;
      }

      if (state.status === 'disputed') {
        log('SELLER', 'Job is under dispute! Consider submitting evidence.');
        // Continue monitoring - dispute will eventually resolve
      }

      await sleep(pollIntervalMs);
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<bigint> {
    const balance = await this.reader.getBalance({ address: this.address });
    log('SELLER', `Balance: ${formatAmount(balance)} ETH`);
    return balance;
  }

  /**
   * Get all active jobs being tracked
   */
  getActiveJobs(): EscrowState[] {
    return Array.from(this.activeJobs.values());
  }
}

// ============================================================================
// Example Usage
// ============================================================================

async function example() {
  // This would be called with a real private key
  const seller = new SellerAgent('0x' + '2'.repeat(64) as `0x${string}`);

  // Scan for pending jobs
  const pendingJobs = await seller.scanForJobs();

  if (pendingJobs.length === 0) {
    console.log('No pending jobs found');
    return;
  }

  // Accept first job
  const escrowId = pendingJobs[0];
  await seller.acceptJob(escrowId);

  // Do the work
  const result = await seller.doWork('Analyze market data');

  // Submit work
  await seller.submitWork(escrowId, result);

  // Wait for payment
  console.log('Work submitted! Waiting for buyer to release payment...');
  const finalStatus = await seller.monitorJob(escrowId, 5000);
  
  console.log(`Final status: ${finalStatus}`);
}

// Run example if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  example().catch(console.error);
}
