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

export { type AgentDisputeRequest, type AgentEscrowRequest, type ArbitratorStake, BASE_MAINNET_ADDRESSES, BASE_SEPOLIA_ADDRESSES, BASIS_POINTS, type CreateDisputeParams, type CreateEscrowParams, DEFAULT_ESCROW_DEADLINE, DEFAULT_MIN_VOTES, DEFAULT_VOTING_PERIOD, type Dispute, type DisputeCreatedResult, DisputeStatus, type EscrowCreatedResult, type EscrowTransaction, KARA_TIERS, KARA_TOKEN_ADDRESS, KaraDispute, type KaraDisputeConfig, KaraDisputeWriter, MIN_ARBITRATOR_STAKE, type RaiseDisputeParams, Ruling, type TransactionReceipt, TransactionStatus, type VoteResult, erc20Abi, getAddresses, karaDisputeV2Abi, karaEscrowAbi, karaPayV2Abi };
