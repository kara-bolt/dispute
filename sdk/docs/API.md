# API Reference

Complete API documentation for `@kara/dispute-sdk`.

## Classes

### `KaraDispute`

Main read-only client.

```typescript
const kara = new KaraDispute({
  chain: 'base' | 'base-sepolia',
  rpcUrl?: string,
  addresses?: Partial<ContractAddresses>,
});
```

### `KaraDisputeWriter`

Write-enabled client. Created via `KaraDispute.withWallet()`.

```typescript
const writer = kara.withWallet(walletClient);
```

---

## Read Methods

### `getDispute(disputeId: bigint): Promise<Dispute>`

Get dispute details by ID.

```typescript
const dispute = await kara.getDispute(1n);
// Returns: { id, claimant, respondent, status, ruling, ... }
```

### `getVoteResult(disputeId: bigint): Promise<VoteResult>`

Get voting results for a dispute.

```typescript
const votes = await kara.getVoteResult(1n);
// Returns: { forClaimant, forRespondent, abstained, agentIds, signatures }
```

### `getEscrowTransaction(transactionId: bigint): Promise<EscrowTransaction>`

Get escrow transaction details.

```typescript
const escrow = await kara.getEscrowTransaction(1n);
// Returns: { id, payer, payee, amount, status, deadline, ... }
```

### `getArbitrationCostKara(holder: Address): Promise<bigint>`

Get arbitration cost in KARA (with holder discount applied).

```typescript
const cost = await kara.getArbitrationCostKara('0x...');
```

### `getArbitrationCostEth(): Promise<bigint>`

Get arbitration cost in ETH (legacy, no discount).

```typescript
const cost = await kara.getArbitrationCostEth();
```

### `getHolderDiscount(holder: Address): Promise<number>`

Get discount in basis points (500 = 5%).

```typescript
const discountBps = await kara.getHolderDiscount('0x...');
```

### `getKaraBalance(address: Address): Promise<bigint>`

Get KARA token balance.

```typescript
const balance = await kara.getKaraBalance('0x...');
```

### `getArbitratorStake(arbitrator: Address): Promise<ArbitratorStake>`

Get staking info for an arbitrator.

```typescript
const stake = await kara.getArbitratorStake('0x...');
// Returns: { amount, stakedAt, lockedUntil, slashedAmount, active }
```

### `isArbitratorActive(arbitrator: Address): Promise<boolean>`

Check if an arbitrator is actively staking.

```typescript
const active = await kara.isArbitratorActive('0x...');
```

### `getDisputeCount(): Promise<bigint>`

Get total number of disputes created.

### `getTotalStaked(): Promise<bigint>`

Get total KARA staked in the protocol.

### `getTotalFeesCollected(): Promise<bigint>`

Get total fees collected by the protocol.

---

## Write Methods

### Escrow Operations

#### `createEscrow(params: CreateEscrowParams): Promise<{ transactionId: bigint; hash: Hash }>`

Create a new escrow transaction.

```typescript
const { transactionId, hash } = await kara.createEscrow({
  payee: '0x...',
  token: '0x...',    // Optional, defaults to ETH
  amount: parseEther('1'),
  description: 'Payment for services',
  deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
});
```

#### `agentCreateEscrow(request: AgentEscrowRequest): Promise<{ transactionId: bigint; hash: Hash }>`

Simplified escrow creation for agents.

```typescript
const { transactionId } = await kara.agentCreateEscrow({
  to: '0x...',
  amount: parseEther('0.5'),
  description: 'API service payment',
  deadlineSeconds: 3600,  // Optional, defaults to 7 days
  token: '0x...',         // Optional, defaults to ETH
});
```

#### `releaseEscrow(transactionId: bigint): Promise<Hash>`

Release escrow funds to payee (happy path).

```typescript
const hash = await kara.releaseEscrow(1n);
```

#### `cancelEscrow(transactionId: bigint): Promise<Hash>`

Cancel an unfunded escrow.

```typescript
const hash = await kara.cancelEscrow(1n);
```

#### `raiseDispute(params: RaiseDisputeParams): Promise<{ disputeId: bigint; hash: Hash }>`

Raise a dispute on an escrow transaction.

```typescript
const { disputeId } = await kara.raiseDispute({
  transactionId: 1n,
  evidenceURI: 'ipfs://Qm...',
});
```

### Dispute Operations

#### `createDisputeWithKara(params: CreateDisputeParams): Promise<{ disputeId: bigint; hash: Hash }>`

Create a direct dispute (not from escrow). Pays fee in KARA.

```typescript
const { disputeId } = await kara.createDisputeWithKara({
  claimant: '0x...',
  respondent: '0x...',
  amount: parseEther('1'),
  evidenceURI: 'ipfs://Qm...',
});
```

#### `agentCreateDispute(request: AgentDisputeRequest): Promise<{ disputeId: bigint; hash: Hash }>`

Simplified dispute creation for agents.

```typescript
const { disputeId } = await kara.agentCreateDispute({
  from: '0x...',
  counterparty: '0x...',
  amount: parseEther('0.5'),
  description: 'Service not delivered',
  evidence: { logs: ['...'], timestamp: Date.now() },
});
```

#### `appealWithKara(disputeId: bigint): Promise<Hash>`

Appeal a dispute ruling. Costs 2x normal arbitration fee.

```typescript
const hash = await kara.appealWithKara(1n);
```

#### `resolveDispute(disputeId: bigint): Promise<Hash>`

Execute the ruling on a resolved dispute.

```typescript
const hash = await kara.resolveDispute(1n);
```

### Staking Operations

#### `stakeKara(amount: bigint): Promise<Hash>`

Stake KARA to become an arbitrator.

```typescript
const hash = await kara.stakeKara(parseEther('50000'));
```

#### `unstakeKara(amount: bigint): Promise<Hash>`

Unstake KARA (after lock period).

```typescript
const hash = await kara.unstakeKara(parseEther('50000'));
```

---

## Utility Methods

### `calculateDiscount(karaBalance: bigint): number`

Calculate holder discount tier (in basis points).

```typescript
const discountBps = kara.calculateDiscount(parseEther('10000'));
// Returns: 1000 (10%)
```

### `calculateDiscountedFee(baseFee: bigint, discountBps: number): bigint`

Calculate fee after discount.

```typescript
const discounted = kara.calculateDiscountedFee(baseFee, 1000);
```

---

## Types

### `Dispute`

```typescript
interface Dispute {
  id: bigint;
  claimant: Address;
  respondent: Address;
  arbitrable: Address;
  amount: bigint;
  evidenceURI: string;
  status: DisputeStatus;
  ruling: number;
  createdAt: bigint;
  resolvedAt: bigint;
  votingDeadline: bigint;
  appealRound: number;
  requiredVotes: bigint;
  karaFeePaid: bigint;
}
```

### `DisputeStatus`

```typescript
enum DisputeStatus {
  None = 0,
  Open = 1,
  Voting = 2,
  Resolved = 3,
  Appealed = 4,
}
```

### `EscrowTransaction`

```typescript
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
```

### `TransactionStatus`

```typescript
enum TransactionStatus {
  Pending = 0,
  Funded = 1,
  Released = 2,
  Disputed = 3,
  Refunded = 4,
}
```

### `ArbitratorStake`

```typescript
interface ArbitratorStake {
  amount: bigint;
  stakedAt: bigint;
  lockedUntil: bigint;
  slashedAmount: bigint;
  active: boolean;
}
```

### `VoteResult`

```typescript
interface VoteResult {
  forClaimant: bigint;
  forRespondent: bigint;
  abstained: bigint;
  agentIds: string[];
  signatures: string[];
}
```

---

## Constants

```typescript
import {
  KARA_TOKEN_ADDRESS,     // KARA token address
  MIN_ARBITRATOR_STAKE,   // 50,000 KARA
  KARA_TIERS,             // Discount tier thresholds
  BASIS_POINTS,           // 10000
  DEFAULT_ESCROW_DEADLINE,// 7 days in seconds
  getAddresses,           // Get contract addresses by chain
} from '@kara/dispute-sdk';
```

### KARA_TIERS

```typescript
const KARA_TIERS = {
  TIER1: { threshold: 1000n * 10n**18n, discount: 500 },     // 5%
  TIER2: { threshold: 10000n * 10n**18n, discount: 1000 },   // 10%
  TIER3: { threshold: 100000n * 10n**18n, discount: 2000 },  // 20%
  TIER4: { threshold: 1000000n * 10n**18n, discount: 3000 }, // 30%
};
```

---

## ABIs

All contract ABIs are exported for custom integrations:

```typescript
import {
  karaDisputeV2Abi,
  karaEscrowAbi,
  karaPayV2Abi,
  erc20Abi,
} from '@kara/dispute-sdk';
```
