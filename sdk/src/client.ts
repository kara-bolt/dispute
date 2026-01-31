/**
 * KaraDispute SDK Client
 * @module @kara/dispute-sdk
 * 
 * Main client for interacting with KaraDispute contracts.
 * Designed for easy integration by AI agents.
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
  zeroAddress,
  parseEventLogs,
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
  type Chain,
  type Account,
  type Transport,
} from 'viem';

import type {
  KaraDisputeConfig,
  CreateEscrowParams,
  CreateDisputeParams,
  RaiseDisputeParams,
  Dispute,
  EscrowTransaction,
  VoteResult,
  ArbitratorStake,
  DisputeStatus,
  TransactionStatus,
  AgentDisputeRequest,
  AgentEscrowRequest,
} from './types';

import {
  getAddresses,
  CHAINS,
  DEFAULT_RPC_URLS,
  DEFAULT_ESCROW_DEADLINE,
  KARA_TIERS,
  BASIS_POINTS,
} from './constants';

import { karaDisputeV2Abi, karaEscrowAbi, karaPayV2Abi, erc20Abi } from './abis';

/**
 * Main client for interacting with KaraDispute protocol.
 * 
 * @example
 * ```typescript
 * import { KaraDispute } from '@kara/dispute-sdk';
 * 
 * const kara = new KaraDispute({ chain: 'base' });
 * 
 * // Read dispute status
 * const dispute = await kara.getDispute(1n);
 * 
 * // Create escrow (requires wallet)
 * const client = kara.withWallet(walletClient);
 * const result = await client.createEscrow({
 *   payee: '0x...',
 *   amount: parseEther('1'),
 *   description: 'Payment for services',
 *   deadline: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60),
 * });
 * ```
 */
export class KaraDispute {
  public readonly chain: Chain;
  public readonly publicClient: PublicClient;
  public readonly addresses: ReturnType<typeof getAddresses>;

  constructor(config: KaraDisputeConfig) {
    const chainKey = config.chain;
    this.chain = CHAINS[chainKey];
    this.addresses = config.addresses 
      ? { ...getAddresses(chainKey), ...config.addresses }
      : getAddresses(chainKey);

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(config.rpcUrl ?? DEFAULT_RPC_URLS[chainKey]),
    });
  }

  /**
   * Create a write-enabled client with a wallet
   */
  withWallet(walletClient: WalletClient<Transport, Chain, Account>): KaraDisputeWriter {
    return new KaraDisputeWriter(this, walletClient);
  }

  // ============ Read Functions ============

  /**
   * Get a dispute by ID
   */
  async getDispute(disputeId: bigint): Promise<Dispute> {
    const data = await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'getDispute',
      args: [disputeId],
    }) as any;

    return this._parseDispute(disputeId, data);
  }

  /**
   * Get vote results for a dispute
   */
  async getVoteResult(disputeId: bigint): Promise<VoteResult> {
    const data = await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'getVoteResult',
      args: [disputeId],
    }) as any;

    return {
      forClaimant: data.forClaimant,
      forRespondent: data.forRespondent,
      abstained: data.abstained,
      agentIds: data.agentIds,
      signatures: data.signatures,
    };
  }

  /**
   * Get arbitrator stake info
   */
  async getArbitratorStake(arbitrator: Address): Promise<ArbitratorStake> {
    const data = await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'getArbitratorStake',
      args: [arbitrator],
    }) as any;

    return {
      amount: data.amount,
      stakedAt: data.stakedAt,
      lockedUntil: data.lockedUntil,
      slashedAmount: data.slashedAmount,
      active: data.active,
    };
  }

  /**
   * Get arbitration cost in KARA (with holder discount)
   */
  async getArbitrationCostKara(holder: Address): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'getArbitrationCostKara',
      args: [holder],
    }) as bigint;
  }

  /**
   * Get arbitration cost in ETH (legacy)
   */
  async getArbitrationCostEth(): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'arbitrationCost',
    }) as bigint;
  }

  /**
   * Get holder discount tier
   */
  async getHolderDiscount(holder: Address): Promise<number> {
    const discount = await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'getHolderDiscount',
      args: [holder],
    }) as bigint;

    return Number(discount);
  }

  /**
   * Get KARA balance
   */
  async getKaraBalance(address: Address): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.addresses.karaToken,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address],
    }) as bigint;
  }

  /**
   * Get escrow transaction
   */
  async getEscrowTransaction(transactionId: bigint): Promise<EscrowTransaction> {
    const data = await this.publicClient.readContract({
      address: this.addresses.karaEscrow,
      abi: karaEscrowAbi,
      functionName: 'getTransaction',
      args: [transactionId],
    }) as any;

    return this._parseEscrowTransaction(transactionId, data);
  }

  /**
   * Check if arbitrator is active
   */
  async isArbitratorActive(arbitrator: Address): Promise<boolean> {
    return await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'isArbitratorActive',
      args: [arbitrator],
    }) as boolean;
  }

  /**
   * Get current ruling for a dispute
   */
  async getCurrentRuling(disputeId: bigint): Promise<{
    ruling: bigint;
    tied: boolean;
    resolved: boolean;
  }> {
    const data = await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'currentRuling',
      args: [disputeId],
    }) as [bigint, boolean, boolean];

    return {
      ruling: data[0],
      tied: data[1],
      resolved: data[2],
    };
  }

  /**
   * Get total fees collected
   */
  async getTotalFeesCollected(): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'totalFeesCollected',
    }) as bigint;
  }

  /**
   * Get total KARA staked
   */
  async getTotalStaked(): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'totalStaked',
    }) as bigint;
  }

  /**
   * Get dispute count
   */
  async getDisputeCount(): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'disputeCount',
    }) as bigint;
  }

  // ============ Utility Functions ============

  /**
   * Calculate holder discount based on KARA balance
   */
  calculateDiscount(karaBalance: bigint): number {
    if (karaBalance >= KARA_TIERS.TIER4.threshold) {
      return KARA_TIERS.TIER4.discount;
    } else if (karaBalance >= KARA_TIERS.TIER3.threshold) {
      return KARA_TIERS.TIER3.discount;
    } else if (karaBalance >= KARA_TIERS.TIER2.threshold) {
      return KARA_TIERS.TIER2.discount;
    } else if (karaBalance >= KARA_TIERS.TIER1.threshold) {
      return KARA_TIERS.TIER1.discount;
    }
    return 0;
  }

  /**
   * Calculate discounted fee
   */
  calculateDiscountedFee(baseFee: bigint, discountBps: number): bigint {
    return baseFee - (baseFee * BigInt(discountBps) / BigInt(BASIS_POINTS));
  }

  // ============ Internal ============

  private _parseDispute(id: bigint, data: any): Dispute {
    return {
      id,
      claimant: data.claimant,
      respondent: data.respondent,
      arbitrable: data.arbitrable,
      amount: data.amount,
      evidenceURI: data.evidenceURI,
      status: Number(data.status) as DisputeStatus,
      ruling: Number(data.ruling),
      createdAt: data.createdAt,
      resolvedAt: data.resolvedAt,
      votingDeadline: data.votingDeadline,
      appealRound: Number(data.appealRound),
      requiredVotes: data.requiredVotes,
      karaFeePaid: data.karaFeePaid,
    };
  }

  private _parseEscrowTransaction(id: bigint, data: any): EscrowTransaction {
    return {
      id,
      payer: data.payer,
      payee: data.payee,
      token: data.token,
      amount: data.amount,
      status: Number(data.status) as TransactionStatus,
      disputeId: data.disputeId,
      description: data.description,
      deadline: data.deadline,
      createdAt: data.createdAt,
    };
  }
}

/**
 * Write-enabled client for KaraDispute transactions
 */
export class KaraDisputeWriter extends KaraDispute {
  public readonly walletClient: WalletClient<Transport, Chain, Account>;
  public readonly account: Account;

  constructor(
    reader: KaraDispute,
    walletClient: WalletClient<Transport, Chain, Account>
  ) {
    super({ chain: reader.chain.id === 8453 ? 'base' : 'base-sepolia' });
    this.walletClient = walletClient;
    this.account = walletClient.account;
  }

  // ============ Escrow Functions ============

  /**
   * Create a new escrow transaction
   */
  async createEscrow(params: CreateEscrowParams): Promise<{
    transactionId: bigint;
    hash: Hash;
  }> {
    const token = params.token ?? zeroAddress;
    const isEth = token === zeroAddress;

    const hash = await this.walletClient.writeContract({
      address: this.addresses.karaEscrow,
      abi: karaEscrowAbi,
      functionName: 'createTransaction',
      args: [
        params.payee,
        token,
        params.amount,
        params.description,
        params.deadline,
      ],
      value: isEth ? params.amount : 0n,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    
    // Parse TransactionCreated event
    const logs = parseEventLogs({
      abi: karaEscrowAbi,
      logs: receipt.logs,
      eventName: 'TransactionCreated',
    }) as unknown as Array<{ args: { transactionId: bigint } }>;

    const transactionId = logs[0]?.args?.transactionId ?? 0n;

    return { transactionId, hash };
  }

  /**
   * Release escrow funds to payee
   */
  async releaseEscrow(transactionId: bigint): Promise<Hash> {
    return await this.walletClient.writeContract({
      address: this.addresses.karaEscrow,
      abi: karaEscrowAbi,
      functionName: 'release',
      args: [transactionId],
    });
  }

  /**
   * Raise a dispute on an escrow
   */
  async raiseDispute(params: RaiseDisputeParams): Promise<{
    disputeId: bigint;
    hash: Hash;
  }> {
    // Get arbitration cost
    const cost = await this.getArbitrationCostEth();

    const hash = await this.walletClient.writeContract({
      address: this.addresses.karaEscrow,
      abi: karaEscrowAbi,
      functionName: 'raiseDispute',
      args: [params.transactionId, params.evidenceURI],
      value: cost,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    const logs = parseEventLogs({
      abi: karaEscrowAbi,
      logs: receipt.logs,
      eventName: 'DisputeRaised',
    }) as unknown as Array<{ args: { disputeId: bigint } }>;

    const disputeId = logs[0]?.args?.disputeId ?? 0n;

    return { disputeId, hash };
  }

  /**
   * Cancel an unfunded escrow
   */
  async cancelEscrow(transactionId: bigint): Promise<Hash> {
    return await this.walletClient.writeContract({
      address: this.addresses.karaEscrow,
      abi: karaEscrowAbi,
      functionName: 'cancel',
      args: [transactionId],
    });
  }

  // ============ Dispute Functions ============

  /**
   * Create a dispute directly (with KARA)
   */
  async createDisputeWithKara(params: CreateDisputeParams): Promise<{
    disputeId: bigint;
    hash: Hash;
  }> {
    // Approve KARA spend
    const cost = await this.getArbitrationCostKara(this.account.address);
    await this._approveKaraIfNeeded(this.addresses.karaDispute, cost);

    const hash = await this.walletClient.writeContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'createDisputeWithKara',
      args: [
        params.claimant,
        params.respondent,
        params.amount,
        params.evidenceURI,
      ],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    const logs = parseEventLogs({
      abi: karaDisputeV2Abi,
      logs: receipt.logs,
      eventName: 'DisputeCreated',
    }) as unknown as Array<{ args: { disputeId: bigint } }>;

    const disputeId = logs[0]?.args?.disputeId ?? 0n;

    return { disputeId, hash };
  }

  /**
   * Appeal a dispute (with KARA)
   */
  async appealWithKara(disputeId: bigint): Promise<Hash> {
    const cost = await this.getArbitrationCostKara(this.account.address);
    const appealCost = cost * 2n; // Appeals cost 2x

    await this._approveKaraIfNeeded(this.addresses.karaDispute, appealCost);

    return await this.walletClient.writeContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'appealWithKara',
      args: [disputeId],
    });
  }

  /**
   * Resolve a dispute (execute ruling)
   */
  async resolveDispute(disputeId: bigint): Promise<Hash> {
    return await this.walletClient.writeContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'resolveDispute',
      args: [disputeId],
    });
  }

  // ============ Staking Functions ============

  /**
   * Stake KARA to become an arbitrator
   */
  async stakeKara(amount: bigint): Promise<Hash> {
    await this._approveKaraIfNeeded(this.addresses.karaDispute, amount);

    return await this.walletClient.writeContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'stakeKara',
      args: [amount],
    });
  }

  /**
   * Unstake KARA
   */
  async unstakeKara(amount: bigint): Promise<Hash> {
    return await this.walletClient.writeContract({
      address: this.addresses.karaDispute,
      abi: karaDisputeV2Abi,
      functionName: 'unstakeKara',
      args: [amount],
    });
  }

  // ============ Agent-Friendly Functions ============

  /**
   * Simple escrow creation for agents
   * Handles defaults and token approvals automatically
   */
  async agentCreateEscrow(request: AgentEscrowRequest): Promise<{
    transactionId: bigint;
    hash: Hash;
  }> {
    const deadlineSeconds = request.deadlineSeconds ?? DEFAULT_ESCROW_DEADLINE;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);

    return this.createEscrow({
      payee: request.to,
      token: request.token,
      amount: request.amount,
      description: request.description,
      deadline,
    });
  }

  /**
   * Simple dispute creation for agents
   * Handles KARA approval automatically
   */
  async agentCreateDispute(request: AgentDisputeRequest): Promise<{
    disputeId: bigint;
    hash: Hash;
  }> {
    // TODO: If evidence object provided, pin to IPFS first
    const evidenceURI = request.evidence 
      ? JSON.stringify(request.evidence) // Placeholder - should pin to IPFS
      : request.description;

    return this.createDisputeWithKara({
      claimant: request.from,
      respondent: request.counterparty,
      amount: request.amount,
      evidenceURI,
    });
  }

  // ============ Internal ============

  private async _approveKaraIfNeeded(spender: Address, amount: bigint): Promise<void> {
    const allowance = await this.publicClient.readContract({
      address: this.addresses.karaToken,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [this.account.address, spender],
    }) as bigint;

    if (allowance < amount) {
      const hash = await this.walletClient.writeContract({
        address: this.addresses.karaToken,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender, amount],
      });
      await this.publicClient.waitForTransactionReceipt({ hash });
    }
  }
}
