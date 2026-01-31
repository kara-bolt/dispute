import { Address, Hash, Chain, PublicClient, WalletClient, Transport, Account } from 'viem';

/**
 * KaraDispute SDK Types
 * @module @kara/dispute-sdk
 */

declare enum DisputeStatus {
    None = 0,
    Open = 1,
    Voting = 2,
    Resolved = 3,
    Appealed = 4
}
declare enum Ruling {
    RefusedToArbitrate = 0,
    Claimant = 1,
    Respondent = 2
}
declare enum TransactionStatus {
    None = 0,
    Created = 1,
    Funded = 2,
    Disputed = 3,
    Resolved = 4,
    Cancelled = 5
}
interface Dispute {
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
interface VoteResult {
    forClaimant: bigint;
    forRespondent: bigint;
    abstained: bigint;
    agentIds: `0x${string}`[];
    signatures: `0x${string}`[];
}
interface ArbitratorStake {
    amount: bigint;
    stakedAt: bigint;
    lockedUntil: bigint;
    slashedAmount: bigint;
    active: boolean;
}
interface EscrowTransaction {
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
interface KaraDisputeConfig {
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
interface CreateEscrowParams {
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
interface CreateDisputeParams {
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
interface RaiseDisputeParams {
    /** Transaction ID to dispute */
    transactionId: bigint;
    /** IPFS URI or URL to evidence */
    evidenceURI: string;
}
interface TransactionReceipt {
    hash: Hash;
    blockNumber: bigint;
    status: 'success' | 'reverted';
}
interface DisputeCreatedResult {
    disputeId: bigint;
    receipt: TransactionReceipt;
}
interface EscrowCreatedResult {
    transactionId: bigint;
    receipt: TransactionReceipt;
}
/**
 * Simplified interface for AI agents to interact with KaraDispute
 */
interface AgentDisputeRequest {
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
interface AgentEscrowRequest {
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

declare const KARA_TOKEN_ADDRESS: Address;
declare const KARA_TIERS: {
    readonly TIER1: {
        readonly threshold: bigint;
        readonly discount: 500;
    };
    readonly TIER2: {
        readonly threshold: bigint;
        readonly discount: 1000;
    };
    readonly TIER3: {
        readonly threshold: bigint;
        readonly discount: 2000;
    };
    readonly TIER4: {
        readonly threshold: bigint;
        readonly discount: 3000;
    };
};
declare const MIN_ARBITRATOR_STAKE: bigint;
declare const BASIS_POINTS = 10000;
interface ContractAddresses {
    karaDispute: Address;
    karaEscrow: Address;
    karaPay: Address;
    karaToken: Address;
}
declare const BASE_MAINNET_ADDRESSES: ContractAddresses;
declare const BASE_SEPOLIA_ADDRESSES: ContractAddresses;
declare function getAddresses(chain: 'base' | 'base-sepolia'): ContractAddresses;
declare const DEFAULT_VOTING_PERIOD: number;
declare const DEFAULT_ESCROW_DEADLINE: number;
declare const DEFAULT_MIN_VOTES = 3;

/**
 * KaraDispute SDK Client
 * @module @kara/dispute-sdk
 *
 * Main client for interacting with KaraDispute contracts.
 * Designed for easy integration by AI agents.
 */

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
declare class KaraDispute {
    readonly chain: Chain;
    readonly publicClient: PublicClient;
    readonly addresses: ReturnType<typeof getAddresses>;
    constructor(config: KaraDisputeConfig);
    /**
     * Create a write-enabled client with a wallet
     */
    withWallet(walletClient: WalletClient<Transport, Chain, Account>): KaraDisputeWriter;
    /**
     * Get a dispute by ID
     */
    getDispute(disputeId: bigint): Promise<Dispute>;
    /**
     * Get vote results for a dispute
     */
    getVoteResult(disputeId: bigint): Promise<VoteResult>;
    /**
     * Get arbitrator stake info
     */
    getArbitratorStake(arbitrator: Address): Promise<ArbitratorStake>;
    /**
     * Get arbitration cost in KARA (with holder discount)
     */
    getArbitrationCostKara(holder: Address): Promise<bigint>;
    /**
     * Get arbitration cost in ETH (legacy)
     */
    getArbitrationCostEth(): Promise<bigint>;
    /**
     * Get holder discount tier
     */
    getHolderDiscount(holder: Address): Promise<number>;
    /**
     * Get KARA balance
     */
    getKaraBalance(address: Address): Promise<bigint>;
    /**
     * Get escrow transaction
     */
    getEscrowTransaction(transactionId: bigint): Promise<EscrowTransaction>;
    /**
     * Check if arbitrator is active
     */
    isArbitratorActive(arbitrator: Address): Promise<boolean>;
    /**
     * Get current ruling for a dispute
     */
    getCurrentRuling(disputeId: bigint): Promise<{
        ruling: bigint;
        tied: boolean;
        resolved: boolean;
    }>;
    /**
     * Get total fees collected
     */
    getTotalFeesCollected(): Promise<bigint>;
    /**
     * Get total KARA staked
     */
    getTotalStaked(): Promise<bigint>;
    /**
     * Get dispute count
     */
    getDisputeCount(): Promise<bigint>;
    /**
     * Calculate holder discount based on KARA balance
     */
    calculateDiscount(karaBalance: bigint): number;
    /**
     * Calculate discounted fee
     */
    calculateDiscountedFee(baseFee: bigint, discountBps: number): bigint;
    private _parseDispute;
    private _parseEscrowTransaction;
}
/**
 * Write-enabled client for KaraDispute transactions
 */
declare class KaraDisputeWriter extends KaraDispute {
    readonly walletClient: WalletClient<Transport, Chain, Account>;
    readonly account: Account;
    constructor(reader: KaraDispute, walletClient: WalletClient<Transport, Chain, Account>);
    /**
     * Create a new escrow transaction
     */
    createEscrow(params: CreateEscrowParams): Promise<{
        transactionId: bigint;
        hash: Hash;
    }>;
    /**
     * Release escrow funds to payee
     */
    releaseEscrow(transactionId: bigint): Promise<Hash>;
    /**
     * Raise a dispute on an escrow
     */
    raiseDispute(params: RaiseDisputeParams): Promise<{
        disputeId: bigint;
        hash: Hash;
    }>;
    /**
     * Cancel an unfunded escrow
     */
    cancelEscrow(transactionId: bigint): Promise<Hash>;
    /**
     * Create a dispute directly (with KARA)
     */
    createDisputeWithKara(params: CreateDisputeParams): Promise<{
        disputeId: bigint;
        hash: Hash;
    }>;
    /**
     * Appeal a dispute (with KARA)
     */
    appealWithKara(disputeId: bigint): Promise<Hash>;
    /**
     * Resolve a dispute (execute ruling)
     */
    resolveDispute(disputeId: bigint): Promise<Hash>;
    /**
     * Stake KARA to become an arbitrator
     */
    stakeKara(amount: bigint): Promise<Hash>;
    /**
     * Unstake KARA
     */
    unstakeKara(amount: bigint): Promise<Hash>;
    /**
     * Simple escrow creation for agents
     * Handles defaults and token approvals automatically
     */
    agentCreateEscrow(request: AgentEscrowRequest): Promise<{
        transactionId: bigint;
        hash: Hash;
    }>;
    /**
     * Simple dispute creation for agents
     * Handles KARA approval automatically
     */
    agentCreateDispute(request: AgentDisputeRequest): Promise<{
        disputeId: bigint;
        hash: Hash;
    }>;
    private _approveKaraIfNeeded;
}

/**
 * Contract ABIs for KaraDispute
 * @module @kara/dispute-sdk
 */
declare const karaDisputeV2Abi: ({
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
    name?: undefined;
    anonymous?: undefined;
    outputs?: undefined;
} | {
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    type: string;
    stateMutability?: undefined;
    anonymous?: undefined;
    outputs?: undefined;
} | {
    anonymous: boolean;
    inputs: {
        indexed: boolean;
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    type: string;
    stateMutability?: undefined;
    outputs?: undefined;
} | {
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    outputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
    anonymous?: undefined;
} | {
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    outputs: {
        components: {
            internalType: string;
            name: string;
            type: string;
        }[];
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
    anonymous?: undefined;
})[];
declare const karaEscrowAbi: ({
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
    name?: undefined;
    anonymous?: undefined;
    outputs?: undefined;
} | {
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    type: string;
    stateMutability?: undefined;
    anonymous?: undefined;
    outputs?: undefined;
} | {
    anonymous: boolean;
    inputs: {
        indexed: boolean;
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    type: string;
    stateMutability?: undefined;
    outputs?: undefined;
} | {
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    outputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
    anonymous?: undefined;
} | {
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    outputs: {
        components: {
            internalType: string;
            name: string;
            type: string;
        }[];
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
    anonymous?: undefined;
} | {
    stateMutability: string;
    type: string;
    inputs?: undefined;
    name?: undefined;
    anonymous?: undefined;
    outputs?: undefined;
})[];
declare const karaPayV2Abi: ({
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
    name?: undefined;
    anonymous?: undefined;
    outputs?: undefined;
} | {
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    type: string;
    stateMutability?: undefined;
    anonymous?: undefined;
    outputs?: undefined;
} | {
    anonymous: boolean;
    inputs: {
        indexed: boolean;
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    type: string;
    stateMutability?: undefined;
    outputs?: undefined;
} | {
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    outputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
    anonymous?: undefined;
} | {
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    outputs: {
        components: {
            internalType: string;
            name: string;
            type: string;
        }[];
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
    anonymous?: undefined;
} | {
    stateMutability: string;
    type: string;
    inputs?: undefined;
    name?: undefined;
    anonymous?: undefined;
    outputs?: undefined;
})[];
declare const erc20Abi: readonly [{
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
    }];
    readonly name: "balanceOf";
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "spender";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "approve";
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "owner";
        readonly type: "address";
    }, {
        readonly name: "spender";
        readonly type: "address";
    }];
    readonly name: "allowance";
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "transfer";
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "bool";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}];

/**
 * Pre-built dispute templates for common scenarios
 * @module @kara/dispute-sdk/flows
 */

type DisputeReason = 'service_not_delivered' | 'quality_issues' | 'partial_delivery' | 'deadline_missed' | 'scope_dispute' | 'payment_dispute' | 'fraud' | 'other';
interface DisputeTemplate {
    reason: DisputeReason;
    title: string;
    description: string;
    suggestedDeadlineHours: number;
    evidenceFields: string[];
}
declare const DISPUTE_TEMPLATES: Record<DisputeReason, DisputeTemplate>;
interface Evidence {
    type: DisputeReason;
    title: string;
    description: string;
    timestamp: number;
    claimant: Address;
    respondent: Address;
    amount: string;
    details: Record<string, unknown>;
    attachments?: string[];
}
declare function buildEvidence(params: {
    type: DisputeReason;
    claimant: Address;
    respondent: Address;
    amount: bigint;
    description: string;
    details?: Record<string, unknown>;
    attachments?: string[];
}): Evidence;
declare const QuickEvidence: {
    /**
     * Service provider didn't deliver
     */
    serviceNotDelivered(params: {
        claimant: Address;
        respondent: Address;
        amount: bigint;
        serviceDescription: string;
        deadline: Date;
        paymentTxHash?: string;
    }): Evidence;
    /**
     * Quality issues with delivered work
     */
    qualityIssues(params: {
        claimant: Address;
        respondent: Address;
        amount: bigint;
        issues: string[];
        deliveredWorkHash?: string;
    }): Evidence;
    /**
     * Partial delivery
     */
    partialDelivery(params: {
        claimant: Address;
        respondent: Address;
        amount: bigint;
        deliveredPercentage: number;
        missingItems: string[];
    }): Evidence;
    /**
     * Custom dispute
     */
    custom(params: {
        claimant: Address;
        respondent: Address;
        amount: bigint;
        title: string;
        description: string;
        details?: Record<string, unknown>;
    }): Evidence;
};

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

interface DisputeFlowConfig {
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
interface SimpleDisputeParams {
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
interface SimpleEscrowDisputeParams {
    /** Escrow transaction ID to dispute */
    escrowId: bigint;
    /** Dispute reason */
    reason: DisputeReason;
    /** Description */
    description?: string;
    /** Additional evidence */
    details?: Record<string, unknown>;
}
interface DisputeResult {
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
interface EscrowDisputeResult extends DisputeResult {
    /** Original escrow transaction */
    escrow: EscrowTransaction;
}
interface FlowStatus {
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
/**
 * DisputeFlow - Simplified dispute creation for AI agents
 *
 * Wraps KaraDispute SDK with template-based evidence building
 * and dead-simple one-liner methods.
 */
declare class DisputeFlow {
    private client;
    private writer?;
    private autoApproveKara;
    constructor(config: DisputeFlowConfig);
    /**
     * Get the wallet address
     */
    get address(): Address | undefined;
    /**
     * Check if write operations are available
     */
    get canWrite(): boolean;
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
    createDispute(params: SimpleDisputeParams): Promise<DisputeResult>;
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
    disputeEscrow(params: SimpleEscrowDisputeParams): Promise<EscrowDisputeResult>;
    /**
     * Quick dispute: Service not delivered
     */
    disputeServiceNotDelivered(params: {
        against: Address;
        amount: bigint;
        serviceDescription: string;
        deadline: Date;
        paymentTxHash?: string;
    }): Promise<DisputeResult>;
    /**
     * Quick dispute: Quality issues
     */
    disputeQualityIssues(params: {
        against: Address;
        amount: bigint;
        issues: string[];
        deliveredWorkHash?: string;
    }): Promise<DisputeResult>;
    /**
     * Quick dispute: Partial delivery
     */
    disputePartialDelivery(params: {
        against: Address;
        amount: bigint;
        deliveredPercentage: number;
        missingItems: string[];
    }): Promise<DisputeResult>;
    /**
     * Get dispute status with human-readable info
     */
    getStatus(disputeId: bigint): Promise<FlowStatus>;
    /**
     * Wait for dispute resolution
     */
    waitForResolution(disputeId: bigint, options?: {
        pollIntervalMs?: number;
        timeoutMs?: number;
    }): Promise<FlowStatus>;
    /**
     * Create evidence URI from evidence object
     * Uses data URL for simplicity - production should use IPFS
     */
    private createEvidenceUri;
    /**
     * Get available dispute templates
     */
    static getTemplates(): typeof DISPUTE_TEMPLATES;
    /**
     * Format amount for display
     */
    static formatAmount(wei: bigint): string;
    /**
     * Parse ETH amount to wei
     */
    static parseAmount(eth: string): bigint;
}

/**
 * Webhook Types for KaraDispute
 * @module @kara/dispute-sdk/webhooks
 */

type WebhookEventType = 'dispute.created' | 'dispute.voting_started' | 'dispute.vote_cast' | 'dispute.resolved' | 'dispute.appealed' | 'escrow.created' | 'escrow.funded' | 'escrow.disputed' | 'escrow.released' | 'escrow.cancelled';
interface WebhookEventBase {
    /** Event type */
    type: WebhookEventType;
    /** Unique event ID */
    eventId: string;
    /** Unix timestamp (seconds) */
    timestamp: number;
    /** Chain ID */
    chainId: number;
    /** Transaction hash that triggered this event */
    txHash?: Hash;
    /** Block number */
    blockNumber?: bigint;
}
interface DisputeCreatedEvent extends WebhookEventBase {
    type: 'dispute.created';
    data: {
        disputeId: bigint;
        claimant: Address;
        respondent: Address;
        amount: bigint;
        evidenceURI: string;
        votingDeadline: bigint;
    };
}
interface DisputeVotingStartedEvent extends WebhookEventBase {
    type: 'dispute.voting_started';
    data: {
        disputeId: bigint;
        votingDeadline: bigint;
        requiredVotes: bigint;
    };
}
interface DisputeVoteCastEvent extends WebhookEventBase {
    type: 'dispute.vote_cast';
    data: {
        disputeId: bigint;
        voter: Address;
        vote: 'claimant' | 'respondent' | 'abstain';
        currentVotes: {
            forClaimant: bigint;
            forRespondent: bigint;
            abstained: bigint;
        };
    };
}
interface DisputeResolvedEvent extends WebhookEventBase {
    type: 'dispute.resolved';
    data: {
        disputeId: bigint;
        ruling: Ruling;
        rulingText: 'claimant' | 'respondent' | 'refused';
        finalVotes: {
            forClaimant: bigint;
            forRespondent: bigint;
            abstained: bigint;
        };
    };
}
interface DisputeAppealedEvent extends WebhookEventBase {
    type: 'dispute.appealed';
    data: {
        disputeId: bigint;
        appellant: Address;
        appealRound: number;
        newVotingDeadline: bigint;
    };
}
interface EscrowCreatedEvent extends WebhookEventBase {
    type: 'escrow.created';
    data: {
        transactionId: bigint;
        payer: Address;
        payee: Address;
        token: Address;
        amount: bigint;
        description: string;
        deadline: bigint;
    };
}
interface EscrowFundedEvent extends WebhookEventBase {
    type: 'escrow.funded';
    data: {
        transactionId: bigint;
        amount: bigint;
    };
}
interface EscrowDisputedEvent extends WebhookEventBase {
    type: 'escrow.disputed';
    data: {
        transactionId: bigint;
        disputeId: bigint;
        disputedBy: Address;
        evidenceURI: string;
    };
}
interface EscrowReleasedEvent extends WebhookEventBase {
    type: 'escrow.released';
    data: {
        transactionId: bigint;
        releasedTo: Address;
        amount: bigint;
    };
}
interface EscrowCancelledEvent extends WebhookEventBase {
    type: 'escrow.cancelled';
    data: {
        transactionId: bigint;
        cancelledBy: Address;
    };
}
type WebhookEvent = DisputeCreatedEvent | DisputeVotingStartedEvent | DisputeVoteCastEvent | DisputeResolvedEvent | DisputeAppealedEvent | EscrowCreatedEvent | EscrowFundedEvent | EscrowDisputedEvent | EscrowReleasedEvent | EscrowCancelledEvent;
interface WebhookSubscription {
    /** Unique subscription ID */
    id: string;
    /** Webhook URL to call */
    url: string;
    /** Events to subscribe to (empty = all) */
    events: WebhookEventType[];
    /** Filter by specific addresses (optional) */
    filterAddresses?: Address[];
    /** Filter by specific dispute IDs (optional) */
    filterDisputeIds?: bigint[];
    /** Secret for HMAC signature verification */
    secret?: string;
    /** Whether subscription is active */
    active: boolean;
    /** Created timestamp */
    createdAt: number;
}
interface WebhookDelivery {
    /** Delivery attempt ID */
    deliveryId: string;
    /** Event ID */
    eventId: string;
    /** Subscription ID */
    subscriptionId: string;
    /** HTTP status code received */
    statusCode?: number;
    /** Whether delivery succeeded */
    success: boolean;
    /** Error message if failed */
    error?: string;
    /** Attempt number */
    attempt: number;
    /** Timestamp */
    timestamp: number;
}
type WebhookHandler<T extends WebhookEvent = WebhookEvent> = (event: T) => void | Promise<void>;
interface WebhookHandlers {
    'dispute.created'?: WebhookHandler<DisputeCreatedEvent>;
    'dispute.voting_started'?: WebhookHandler<DisputeVotingStartedEvent>;
    'dispute.vote_cast'?: WebhookHandler<DisputeVoteCastEvent>;
    'dispute.resolved'?: WebhookHandler<DisputeResolvedEvent>;
    'dispute.appealed'?: WebhookHandler<DisputeAppealedEvent>;
    'escrow.created'?: WebhookHandler<EscrowCreatedEvent>;
    'escrow.funded'?: WebhookHandler<EscrowFundedEvent>;
    'escrow.disputed'?: WebhookHandler<EscrowDisputedEvent>;
    'escrow.released'?: WebhookHandler<EscrowReleasedEvent>;
    'escrow.cancelled'?: WebhookHandler<EscrowCancelledEvent>;
    '*'?: WebhookHandler<WebhookEvent>;
}
interface WebhookPollerConfig {
    /** Chain to monitor */
    chain: 'base' | 'base-sepolia';
    /** Custom RPC URL */
    rpcUrl?: string;
    /** Poll interval in milliseconds */
    pollIntervalMs?: number;
    /** Dispute IDs to monitor (empty = all new) */
    disputeIds?: bigint[];
    /** Addresses to monitor (claimant or respondent) */
    addresses?: Address[];
    /** Start from block number */
    fromBlock?: bigint;
}

/**
 * Webhook Poller - Polls chain for dispute events and triggers webhooks
 * @module @kara/dispute-sdk/webhooks
 *
 * The chain doesn't push events natively, so we poll and emit.
 *
 * @example
 * ```typescript
 * import { WebhookPoller } from '@kara/dispute-sdk/webhooks';
 *
 * const poller = new WebhookPoller({
 *   chain: 'base',
 *   pollIntervalMs: 30_000, // 30 seconds
 *   disputeIds: [1n, 2n, 3n], // Monitor specific disputes
 * });
 *
 * poller.on('dispute.resolved', (event) => {
 *   console.log(`Dispute ${event.data.disputeId} resolved: ${event.data.rulingText}`);
 * });
 *
 * poller.start();
 * ```
 */

declare class WebhookPoller {
    private client;
    private publicClient;
    private config;
    private handlers;
    private disputeStates;
    private isRunning;
    private pollTimer?;
    private lastBlockNumber;
    private chainId;
    constructor(config: WebhookPollerConfig);
    /**
     * Subscribe to a specific event type
     */
    on<T extends WebhookEventType>(eventType: T, handler: WebhookHandler<Extract<WebhookEvent, {
        type: T;
    }>>): () => void;
    /**
     * Subscribe to all events
     */
    onAll(handler: WebhookHandler<WebhookEvent>): () => void;
    /**
     * Subscribe to multiple event types at once
     */
    subscribe(handlers: WebhookHandlers): () => void;
    /**
     * Start polling
     */
    start(): Promise<void>;
    /**
     * Stop polling
     */
    stop(): void;
    /**
     * Check if running
     */
    get running(): boolean;
    /**
     * Add a dispute to monitor
     */
    addDispute(disputeId: bigint): void;
    /**
     * Remove a dispute from monitoring
     */
    removeDispute(disputeId: bigint): void;
    private poll;
    private checkDisputeStates;
    private inferVoteType;
    private rulingToText;
    private emit;
}

/**
 * Webhook Relay - Receives events and forwards to registered webhooks
 * @module @kara/dispute-sdk/webhooks
 *
 * Run as a standalone service to forward dispute events to your agent's webhook URL.
 *
 * @example
 * ```typescript
 * import { WebhookRelay, WebhookPoller } from '@kara/dispute-sdk/webhooks';
 *
 * // Create poller
 * const poller = new WebhookPoller({ chain: 'base' });
 *
 * // Create relay
 * const relay = new WebhookRelay();
 *
 * // Register a webhook
 * relay.register({
 *   url: 'https://my-agent.com/webhooks/karadispute',
 *   events: ['dispute.resolved', 'dispute.appealed'],
 *   secret: 'my-webhook-secret',
 * });
 *
 * // Connect poller to relay
 * poller.onAll((event) => relay.dispatch(event));
 *
 * // Start
 * poller.start();
 * ```
 */

interface WebhookRelayConfig {
    /** Maximum retry attempts */
    maxRetries?: number;
    /** Retry delay in ms (exponential backoff applied) */
    retryDelayMs?: number;
    /** Request timeout in ms */
    timeoutMs?: number;
    /** Store delivery history */
    storeHistory?: boolean;
    /** Max history entries to keep */
    maxHistoryEntries?: number;
}
interface RegisterWebhookParams {
    /** Webhook URL */
    url: string;
    /** Events to receive (empty = all) */
    events?: WebhookEventType[];
    /** Filter by addresses (optional) */
    filterAddresses?: `0x${string}`[];
    /** Filter by dispute IDs (optional) */
    filterDisputeIds?: bigint[];
    /** Secret for HMAC signature */
    secret?: string;
}
declare class WebhookRelay {
    private subscriptions;
    private deliveryHistory;
    private config;
    private pendingDeliveries;
    constructor(config?: WebhookRelayConfig);
    /**
     * Register a new webhook
     */
    register(params: RegisterWebhookParams): WebhookSubscription;
    /**
     * Unregister a webhook
     */
    unregister(subscriptionId: string): boolean;
    /**
     * Get all subscriptions
     */
    getSubscriptions(): WebhookSubscription[];
    /**
     * Get subscription by ID
     */
    getSubscription(id: string): WebhookSubscription | undefined;
    /**
     * Pause a subscription
     */
    pause(subscriptionId: string): boolean;
    /**
     * Resume a subscription
     */
    resume(subscriptionId: string): boolean;
    /**
     * Dispatch an event to all matching webhooks
     */
    dispatch(event: WebhookEvent): Promise<void>;
    private findMatchingSubscriptions;
    private extractAddresses;
    private extractDisputeId;
    private deliverToSubscription;
    private sendWebhook;
    private signPayload;
    private sleep;
    /**
     * Get delivery history
     */
    getHistory(options?: {
        subscriptionId?: string;
        eventId?: string;
        successOnly?: boolean;
        limit?: number;
    }): WebhookDelivery[];
    /**
     * Clear delivery history
     */
    clearHistory(): void;
}
/**
 * Verify webhook signature (for use in your webhook handler)
 */
declare function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;

export { type AgentDisputeRequest, type AgentEscrowRequest, type ArbitratorStake, BASE_MAINNET_ADDRESSES, BASE_SEPOLIA_ADDRESSES, BASIS_POINTS, type CreateDisputeParams, type CreateEscrowParams, DEFAULT_ESCROW_DEADLINE, DEFAULT_MIN_VOTES, DEFAULT_VOTING_PERIOD, DISPUTE_TEMPLATES, type Dispute, type DisputeAppealedEvent, type DisputeCreatedEvent, type DisputeCreatedResult, DisputeFlow, type DisputeFlowConfig, type DisputeReason, type DisputeResolvedEvent, type DisputeResult, DisputeStatus, type DisputeTemplate, type DisputeVoteCastEvent, type DisputeVotingStartedEvent, type EscrowCancelledEvent, type EscrowCreatedEvent, type EscrowCreatedResult, type EscrowDisputeResult, type EscrowDisputedEvent, type EscrowFundedEvent, type EscrowReleasedEvent, type EscrowTransaction, type Evidence, type FlowStatus, KARA_TIERS, KARA_TOKEN_ADDRESS, KaraDispute, type KaraDisputeConfig, KaraDisputeWriter, MIN_ARBITRATOR_STAKE, QuickEvidence, type RaiseDisputeParams, type RegisterWebhookParams, Ruling, type SimpleDisputeParams, type SimpleEscrowDisputeParams, type TransactionReceipt, TransactionStatus, type VoteResult, type WebhookDelivery, type WebhookEvent, type WebhookEventBase, type WebhookEventType, type WebhookHandler, type WebhookHandlers, WebhookPoller, type WebhookPollerConfig, WebhookRelay, type WebhookRelayConfig, type WebhookSubscription, buildEvidence, erc20Abi, getAddresses, karaDisputeV2Abi, karaEscrowAbi, karaPayV2Abi, verifyWebhookSignature };
