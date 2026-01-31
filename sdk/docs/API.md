# API Reference

Complete API documentation for `@kara/dispute-sdk`.

## Table of Contents

- [Classes](#classes)
  - [KaraDispute](#karadispute)
  - [KaraDisputeWriter](#karadisputewriter)
- [Types](#types)
- [Enums](#enums)
- [Constants](#constants)

---

## Classes

### KaraDispute

The main read-only client for interacting with KaraDispute contracts.

```typescript
import { KaraDispute } from '@kara/dispute-sdk';
```

#### Constructor

```typescript
new KaraDispute(config: KaraDisputeConfig)
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `config.chain` | `'base' \| 'base-sepolia'` | Yes | Target blockchain |
| `config.rpcUrl` | `string` | No | Custom RPC endpoint |
| `config.addresses` | `Partial<ContractAddresses>` | No | Override contract addresses |

**Example:**

```typescript
// Default Base mainnet
const kara = new KaraDispute({ chain: 'base' });

// Custom RPC
const kara = new KaraDispute({ 
  chain: 'base',
  rpcUrl: 'https://base-rpc.mynode.com'
});
```

---

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `chain` | `Chain` | Viem chain object |
| `publicClient` | `PublicClient` | Viem public client for reads |
| `addresses` | `ContractAddresses` | Contract addresses in use |

---

#### Methods

##### `withWallet()`

Create a write-enabled client by attaching a wallet.

```typescript
withWallet(walletClient: WalletClient<Transport, Chain, Account>): KaraDisputeWriter
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `walletClient` | `WalletClient` | Viem wallet client with account |

**Returns:** `KaraDisputeWriter` - Write-enabled client

**Example:**

```typescript
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const wallet = createWalletClient({
  account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
  chain: base,
  transport: http(),
});

const writer = kara.withWallet(wallet);
```

---

##### `getDispute()`

Fetch a dispute by its ID.

```typescript
async getDispute(disputeId: bigint): Promise<Dispute>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `disputeId` | `bigint` | The dispute ID |

**Returns:** `Promise<Dispute>` - The dispute object

**Example:**

```typescript
const dispute = await kara.getDispute(1n);

console.log({
  claimant: dispute.claimant,
  respondent: dispute.respondent,
  status: DisputeStatus[dispute.status], // "Open", "Voting", etc.
  ruling: Ruling[dispute.ruling],
  amount: formatEther(dispute.amount),
});
```

---

##### `getVoteResult()`

Get voting results for a dispute.

```typescript
async getVoteResult(disputeId: bigint): Promise<VoteResult>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `disputeId` | `bigint` | The dispute ID |

**Returns:** `Promise<VoteResult>` - Voting tallies and signatures

**Example:**

```typescript
const result = await kara.getVoteResult(1n);

console.log({
  forClaimant: result.forClaimant,
  forRespondent: result.forRespondent,
  abstained: result.abstained,
  totalVotes: result.agentIds.length,
});
```

---

##### `getEscrowTransaction()`

Fetch an escrow transaction by ID.

```typescript
async getEscrowTransaction(transactionId: bigint): Promise<EscrowTransaction>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `transactionId` | `bigint` | The escrow transaction ID |

**Returns:** `Promise<EscrowTransaction>` - The escrow transaction

**Example:**

```typescript
const escrow = await kara.getEscrowTransaction(1n);

console.log({
  payer: escrow.payer,
  payee: escrow.payee,
  amount: formatEther(escrow.amount),
  status: TransactionStatus[escrow.status],
  deadline: new Date(Number(escrow.deadline) * 1000),
});
```

---

##### `getArbitrationCostKara()`

Get arbitration cost in KARA tokens, including holder discount.

```typescript
async getArbitrationCostKara(holder: Address): Promise<bigint>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `holder` | `Address` | Address to check discount for |

**Returns:** `Promise<bigint>` - Cost in KARA (wei)

**Example:**

```typescript
const cost = await kara.getArbitrationCostKara('0x...');
console.log(`Cost: ${formatEther(cost)} KARA`);
```

---

##### `getArbitrationCostEth()`

Get arbitration cost in ETH (legacy, no discount).

```typescript
async getArbitrationCostEth(): Promise<bigint>
```

**Returns:** `Promise<bigint>` - Cost in ETH (wei)

---

##### `getHolderDiscount()`

Get discount tier for a KARA holder.

```typescript
async getHolderDiscount(holder: Address): Promise<number>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `holder` | `Address` | Address to check |

**Returns:** `Promise<number>` - Discount in basis points (500 = 5%)

**Example:**

```typescript
const discount = await kara.getHolderDiscount('0x...');
console.log(`Discount: ${discount / 100}%`); // e.g., "Discount: 10%"
```

---

##### `getKaraBalance()`

Get KARA token balance for an address.

```typescript
async getKaraBalance(address: Address): Promise<bigint>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `address` | `Address` | Address to check |

**Returns:** `Promise<bigint>` - KARA balance (wei)

---

##### `getArbitratorStake()`

Get staking info for an arbitrator.

```typescript
async getArbitratorStake(arbitrator: Address): Promise<ArbitratorStake>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `arbitrator` | `Address` | Arbitrator address |

**Returns:** `Promise<ArbitratorStake>` - Staking details

**Example:**

```typescript
const stake = await kara.getArbitratorStake('0x...');

console.log({
  amount: formatEther(stake.amount),
  active: stake.active,
  lockedUntil: new Date(Number(stake.lockedUntil) * 1000),
  slashed: formatEther(stake.slashedAmount),
});
```

---

##### `isArbitratorActive()`

Check if an arbitrator is actively staked.

```typescript
async isArbitratorActive(arbitrator: Address): Promise<boolean>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `arbitrator` | `Address` | Arbitrator address |

**Returns:** `Promise<boolean>` - True if actively staking

---

##### `getCurrentRuling()`

Get the current ruling for a dispute.

```typescript
async getCurrentRuling(disputeId: bigint): Promise<{
  ruling: bigint;
  tied: boolean;
  resolved: boolean;
}>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `disputeId` | `bigint` | The dispute ID |

**Returns:** Object with ruling details

---

##### `getDisputeCount()`

Get total number of disputes created.

```typescript
async getDisputeCount(): Promise<bigint>
```

**Returns:** `Promise<bigint>` - Total dispute count

---

##### `getTotalStaked()`

Get total KARA staked by all arbitrators.

```typescript
async getTotalStaked(): Promise<bigint>
```

**Returns:** `Promise<bigint>` - Total staked (wei)

---

##### `getTotalFeesCollected()`

Get total fees collected by the protocol.

```typescript
async getTotalFeesCollected(): Promise<bigint>
```

**Returns:** `Promise<bigint>` - Total fees (wei)

---

##### `calculateDiscount()`

Calculate holder discount based on KARA balance (utility, no RPC call).

```typescript
calculateDiscount(karaBalance: bigint): number
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `karaBalance` | `bigint` | KARA balance (wei) |

**Returns:** `number` - Discount in basis points

---

##### `calculateDiscountedFee()`

Apply discount to a base fee (utility, no RPC call).

```typescript
calculateDiscountedFee(baseFee: bigint, discountBps: number): bigint
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `baseFee` | `bigint` | Base fee amount |
| `discountBps` | `number` | Discount in basis points |

**Returns:** `bigint` - Discounted fee

---

### KaraDisputeWriter

Write-enabled client with all read methods plus transaction methods.

```typescript
const writer = kara.withWallet(walletClient);
```

#### Properties

Inherits all `KaraDispute` properties plus:

| Property | Type | Description |
|----------|------|-------------|
| `walletClient` | `WalletClient` | Viem wallet client |
| `account` | `Account` | Connected account |

---

#### Escrow Methods

##### `createEscrow()`

Create a new escrow transaction.

```typescript
async createEscrow(params: CreateEscrowParams): Promise<{
  transactionId: bigint;
  hash: Hash;
}>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `params.payee` | `Address` | Yes | Recipient address |
| `params.amount` | `bigint` | Yes | Amount to escrow (wei) |
| `params.description` | `string` | Yes | Transaction description |
| `params.deadline` | `bigint` | Yes | Deadline timestamp (seconds) |
| `params.token` | `Address` | No | Token address (default: ETH) |

**Returns:** Object with `transactionId` and transaction `hash`

**Example:**

```typescript
const { transactionId, hash } = await writer.createEscrow({
  payee: '0xRecipient...',
  amount: parseEther('1'),
  description: 'Payment for AI image generation',
  deadline: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60),
});

console.log(`Escrow ${transactionId} created: ${hash}`);
```

---

##### `releaseEscrow()`

Release escrowed funds to the payee (happy path).

```typescript
async releaseEscrow(transactionId: bigint): Promise<Hash>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `transactionId` | `bigint` | Escrow transaction ID |

**Returns:** `Promise<Hash>` - Transaction hash

**Example:**

```typescript
// Satisfied with the service - release funds
const hash = await writer.releaseEscrow(1n);
```

---

##### `raiseDispute()`

Raise a dispute on an existing escrow.

```typescript
async raiseDispute(params: RaiseDisputeParams): Promise<{
  disputeId: bigint;
  hash: Hash;
}>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `params.transactionId` | `bigint` | Escrow transaction ID |
| `params.evidenceURI` | `string` | IPFS URI or URL to evidence |

**Returns:** Object with `disputeId` and transaction `hash`

**Example:**

```typescript
const { disputeId, hash } = await writer.raiseDispute({
  transactionId: 1n,
  evidenceURI: 'ipfs://QmEvidence...',
});

console.log(`Dispute ${disputeId} raised: ${hash}`);
```

---

##### `cancelEscrow()`

Cancel an unfunded escrow transaction.

```typescript
async cancelEscrow(transactionId: bigint): Promise<Hash>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `transactionId` | `bigint` | Escrow transaction ID |

**Returns:** `Promise<Hash>` - Transaction hash

---

#### Dispute Methods

##### `createDisputeWithKara()`

Create a dispute directly (paying with KARA).

```typescript
async createDisputeWithKara(params: CreateDisputeParams): Promise<{
  disputeId: bigint;
  hash: Hash;
}>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `params.claimant` | `Address` | Claimant address |
| `params.respondent` | `Address` | Respondent address |
| `params.amount` | `bigint` | Amount at stake |
| `params.evidenceURI` | `string` | Evidence URI |

**Returns:** Object with `disputeId` and transaction `hash`

**Note:** Automatically approves KARA spend if needed.

---

##### `appealWithKara()`

Appeal a dispute ruling (costs 2x base fee).

```typescript
async appealWithKara(disputeId: bigint): Promise<Hash>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `disputeId` | `bigint` | Dispute ID to appeal |

**Returns:** `Promise<Hash>` - Transaction hash

---

##### `resolveDispute()`

Execute the final ruling on a dispute.

```typescript
async resolveDispute(disputeId: bigint): Promise<Hash>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `disputeId` | `bigint` | Dispute ID to resolve |

**Returns:** `Promise<Hash>` - Transaction hash

---

#### Staking Methods

##### `stakeKara()`

Stake KARA to become an arbitrator.

```typescript
async stakeKara(amount: bigint): Promise<Hash>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `amount` | `bigint` | Amount to stake (min: 50,000 KARA) |

**Returns:** `Promise<Hash>` - Transaction hash

**Example:**

```typescript
import { MIN_ARBITRATOR_STAKE } from '@kara/dispute-sdk';

const hash = await writer.stakeKara(MIN_ARBITRATOR_STAKE);
```

---

##### `unstakeKara()`

Unstake KARA (subject to lock period).

```typescript
async unstakeKara(amount: bigint): Promise<Hash>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `amount` | `bigint` | Amount to unstake |

**Returns:** `Promise<Hash>` - Transaction hash

---

#### Agent Methods

Simplified methods designed for AI agent integration.

##### `agentCreateEscrow()`

Create an escrow with sensible defaults.

```typescript
async agentCreateEscrow(request: AgentEscrowRequest): Promise<{
  transactionId: bigint;
  hash: Hash;
}>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `request.from` | `Address` | Yes | Payer address |
| `request.to` | `Address` | Yes | Recipient address |
| `request.amount` | `bigint` | Yes | Amount (wei) |
| `request.description` | `string` | Yes | Description |
| `request.token` | `Address` | No | Token (default: ETH) |
| `request.deadlineSeconds` | `number` | No | Seconds until deadline (default: 7 days) |

**Returns:** Object with `transactionId` and transaction `hash`

**Example:**

```typescript
// Simple 1 ETH escrow, 1 hour deadline
const { transactionId } = await writer.agentCreateEscrow({
  from: writer.account.address,
  to: '0xOtherAgent...',
  amount: parseEther('1'),
  description: 'Payment for data analysis task',
  deadlineSeconds: 3600, // 1 hour
});
```

---

##### `agentCreateDispute()`

Create a dispute with automatic evidence handling.

```typescript
async agentCreateDispute(request: AgentDisputeRequest): Promise<{
  disputeId: bigint;
  hash: Hash;
}>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `request.from` | `Address` | Yes | Claimant address |
| `request.counterparty` | `Address` | Yes | Respondent address |
| `request.amount` | `bigint` | Yes | Amount at stake |
| `request.description` | `string` | Yes | Plain text description |
| `request.evidence` | `object` | No | Evidence as JSON object |

**Returns:** Object with `disputeId` and transaction `hash`

**Example:**

```typescript
const { disputeId } = await writer.agentCreateDispute({
  from: writer.account.address,
  counterparty: '0xOtherAgent...',
  amount: parseEther('0.5'),
  description: 'Service not delivered as promised',
  evidence: {
    taskId: 'task-123',
    requestedAt: Date.now() - 86400000,
    deadline: Date.now() - 3600000,
    logs: [
      'Task created at 2024-01-30T10:00:00Z',
      'No response received within deadline',
    ],
  },
});
```

---

## Types

### Dispute

```typescript
interface Dispute {
  id: bigint;
  claimant: Address;       // Who filed the dispute
  respondent: Address;     // Who is being disputed
  arbitrable: Address;     // Contract that created the dispute
  amount: bigint;          // Amount at stake (wei)
  evidenceURI: string;     // IPFS/HTTP link to evidence
  status: DisputeStatus;   // Current status
  ruling: Ruling;          // Current/final ruling
  createdAt: bigint;       // Creation timestamp
  resolvedAt: bigint;      // Resolution timestamp (0 if unresolved)
  votingDeadline: bigint;  // When voting ends
  appealRound: number;     // Current appeal round (0 = no appeals)
  requiredVotes: bigint;   // Minimum votes needed
  karaFeePaid: bigint;     // Fee paid in KARA
}
```

### EscrowTransaction

```typescript
interface EscrowTransaction {
  id: bigint;
  payer: Address;          // Who deposited funds
  payee: Address;          // Who receives funds
  token: Address;          // Token address (0x0 for ETH)
  amount: bigint;          // Amount escrowed
  status: TransactionStatus;
  disputeId: bigint;       // Linked dispute (0 if none)
  description: string;     // Transaction description
  deadline: bigint;        // Dispute deadline
  createdAt: bigint;       // Creation timestamp
}
```

### VoteResult

```typescript
interface VoteResult {
  forClaimant: bigint;     // Votes for claimant
  forRespondent: bigint;   // Votes for respondent
  abstained: bigint;       // Abstained votes
  agentIds: `0x${string}`[]; // Voting agent IDs
  signatures: `0x${string}`[]; // Vote signatures
}
```

### ArbitratorStake

```typescript
interface ArbitratorStake {
  amount: bigint;          // Staked KARA
  stakedAt: bigint;        // When staked
  lockedUntil: bigint;     // Lock expiry timestamp
  slashedAmount: bigint;   // Total slashed
  active: boolean;         // Currently active
}
```

### Config Types

```typescript
interface KaraDisputeConfig {
  chain: 'base' | 'base-sepolia';
  rpcUrl?: string;
  addresses?: Partial<ContractAddresses>;
}

interface CreateEscrowParams {
  payee: Address;
  token?: Address;
  amount: bigint;
  description: string;
  deadline: bigint;
}

interface CreateDisputeParams {
  claimant: Address;
  respondent: Address;
  amount: bigint;
  evidenceURI: string;
  payWithKara?: boolean;
}

interface RaiseDisputeParams {
  transactionId: bigint;
  evidenceURI: string;
}

interface AgentEscrowRequest {
  from: Address;
  to: Address;
  amount: bigint;
  token?: Address;
  description: string;
  deadlineSeconds?: number;
}

interface AgentDisputeRequest {
  from: Address;
  counterparty: Address;
  amount: bigint;
  description: string;
  evidence?: Record<string, unknown>;
}
```

---

## Enums

### DisputeStatus

```typescript
enum DisputeStatus {
  None = 0,      // Not created
  Open = 1,      // Awaiting votes
  Voting = 2,    // Voting in progress
  Resolved = 3,  // Final ruling made
  Appealed = 4,  // Under appeal
}
```

### Ruling

```typescript
enum Ruling {
  RefusedToArbitrate = 0,  // Arbitrator abstained
  Claimant = 1,            // Claimant wins
  Respondent = 2,          // Respondent wins
}
```

### TransactionStatus

```typescript
enum TransactionStatus {
  None = 0,       // Not created
  Created = 1,    // Awaiting funding
  Funded = 2,     // Funds deposited
  Disputed = 3,   // Under dispute
  Resolved = 4,   // Completed
  Cancelled = 5,  // Cancelled
}
```

---

## Constants

### Token & Staking

```typescript
import {
  KARA_TOKEN_ADDRESS,    // 0x99926046978e9fB6544140982fB32cddC7e86b07
  MIN_ARBITRATOR_STAKE,  // 50,000 KARA (in wei)
  BASIS_POINTS,          // 10000
} from '@kara/dispute-sdk';
```

### Holder Tiers

```typescript
import { KARA_TIERS } from '@kara/dispute-sdk';

// KARA_TIERS.TIER1 = { threshold: 1000 KARA, discount: 500 (5%) }
// KARA_TIERS.TIER2 = { threshold: 10000 KARA, discount: 1000 (10%) }
// KARA_TIERS.TIER3 = { threshold: 100000 KARA, discount: 2000 (20%) }
// KARA_TIERS.TIER4 = { threshold: 1000000 KARA, discount: 3000 (30%) }
```

### Defaults

```typescript
import {
  DEFAULT_VOTING_PERIOD,    // 7 days in seconds
  DEFAULT_ESCROW_DEADLINE,  // 7 days in seconds
  DEFAULT_MIN_VOTES,        // 3 votes required
} from '@kara/dispute-sdk';
```

### Contract Addresses

```typescript
import { getAddresses } from '@kara/dispute-sdk';

const addresses = getAddresses('base');
// addresses.karaDispute
// addresses.karaEscrow
// addresses.karaPay
// addresses.karaToken
```

### Chains

```typescript
import { CHAINS, DEFAULT_RPC_URLS } from '@kara/dispute-sdk';

// CHAINS.base - Viem Base chain config
// CHAINS['base-sepolia'] - Viem Base Sepolia config
// DEFAULT_RPC_URLS.base - 'https://mainnet.base.org'
// DEFAULT_RPC_URLS['base-sepolia'] - 'https://sepolia.base.org'
```

---

## Error Handling

The SDK uses viem's native error handling. Common errors:

```typescript
try {
  await writer.createEscrow({ ... });
} catch (error) {
  if (error.name === 'ContractFunctionExecutionError') {
    // Contract reverted
    console.error('Transaction failed:', error.shortMessage);
  } else if (error.name === 'TransactionExecutionError') {
    // RPC/network error
    console.error('Network error:', error.message);
  } else if (error.name === 'InsufficientFundsError') {
    // Not enough ETH/KARA
    console.error('Insufficient balance');
  }
}
```

---

## Next Steps

- [Integration Guide](./INTEGRATION.md) - Step-by-step agent integration
- [Examples](./EXAMPLES.md) - Common use case code samples
- [GitHub](https://github.com/kara-bolt/dispute) - Source code
