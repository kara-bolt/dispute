# @kara/dispute-sdk

TypeScript SDK for **KaraDispute** — AI-arbitrated dispute resolution on Base.

Built for AI agents. Simple, typed, and ready for agent-to-agent transactions.

## Installation

```bash
npm install @kara/dispute-sdk viem
# or
pnpm add @kara/dispute-sdk viem
```

## Quick Start

### Read-Only Operations

```typescript
import { KaraDispute } from '@kara/dispute-sdk';

// Create client
const kara = new KaraDispute({ chain: 'base' });

// Get dispute info
const dispute = await kara.getDispute(1n);
console.log(dispute.status, dispute.ruling);

// Get arbitration cost with holder discount
const cost = await kara.getArbitrationCostKara('0x...');

// Check if arbitrator is active
const active = await kara.isArbitratorActive('0x...');
```

### Write Operations

```typescript
import { KaraDispute } from '@kara/dispute-sdk';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// Create wallet
const wallet = createWalletClient({
  account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
  chain: base,
  transport: http(),
});

// Create write client
const kara = new KaraDispute({ chain: 'base' }).withWallet(wallet);

// Create escrow
const { transactionId, hash } = await kara.createEscrow({
  payee: '0xRecipient...',
  amount: parseEther('1'),
  description: 'Payment for AI services',
  deadline: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60),
});

console.log('Escrow created:', transactionId);

// Release funds (happy path)
await kara.releaseEscrow(transactionId);

// OR raise dispute
const { disputeId } = await kara.raiseDispute({
  transactionId,
  evidenceURI: 'ipfs://Qm...',
});
```

## Agent Integration

Simplified methods designed for AI agents:

```typescript
// Agent-friendly escrow creation
const { transactionId } = await kara.agentCreateEscrow({
  from: agentWallet,
  to: counterpartyAgent,
  amount: parseEther('0.5'),
  description: 'API call payment',
  deadlineSeconds: 3600, // 1 hour
});

// Agent-friendly dispute creation
const { disputeId } = await kara.agentCreateDispute({
  from: agentWallet,
  counterparty: otherAgent,
  amount: parseEther('0.5'),
  description: 'Service not delivered',
  evidence: {
    timestamp: Date.now(),
    transactionId: '...',
    logs: ['...'],
  },
});
```

## $KARA Token Integration

KaraDispute uses $KARA for:
- Arbitration fees (with holder discounts)
- Arbitrator staking
- Slashing for misbehavior

### Holder Discounts

| KARA Balance | Discount |
|--------------|----------|
| 1,000+ | 5% |
| 10,000+ | 10% |
| 100,000+ | 20% |
| 1,000,000+ | 30% |

```typescript
// Check discount tier
const discount = await kara.getHolderDiscount(address);

// Get discounted fee
const cost = await kara.getArbitrationCostKara(address);
```

### Staking

```typescript
import { MIN_ARBITRATOR_STAKE } from '@kara/dispute-sdk';

// Stake to become an arbitrator
await kara.stakeKara(MIN_ARBITRATOR_STAKE); // 50,000 KARA

// Check stake status
const stake = await kara.getArbitratorStake(address);
console.log(stake.amount, stake.active);

// Unstake (after lock period)
await kara.unstakeKara(amount);
```

## API Reference

### KaraDispute (Read-Only)

| Method | Description |
|--------|-------------|
| `getDispute(id)` | Get dispute by ID |
| `getVoteResult(id)` | Get voting results for dispute |
| `getEscrowTransaction(id)` | Get escrow transaction |
| `getArbitrationCostKara(holder)` | Get fee in KARA with discount |
| `getArbitrationCostEth()` | Get legacy ETH fee |
| `getHolderDiscount(holder)` | Get discount in basis points |
| `getKaraBalance(address)` | Get KARA balance |
| `getArbitratorStake(address)` | Get staking info |
| `isArbitratorActive(address)` | Check if actively staking |
| `getDisputeCount()` | Total disputes created |
| `getTotalStaked()` | Total KARA staked |
| `getTotalFeesCollected()` | Total fees collected |

### KaraDisputeWriter (Write)

All read methods plus:

| Method | Description |
|--------|-------------|
| `createEscrow(params)` | Create new escrow |
| `releaseEscrow(id)` | Release funds to payee |
| `raiseDispute(params)` | Raise dispute on escrow |
| `cancelEscrow(id)` | Cancel unfunded escrow |
| `createDisputeWithKara(params)` | Create direct dispute |
| `appealWithKara(id)` | Appeal a ruling |
| `resolveDispute(id)` | Execute ruling |
| `stakeKara(amount)` | Stake to become arbitrator |
| `unstakeKara(amount)` | Unstake KARA |
| `agentCreateEscrow(request)` | Simplified agent escrow |
| `agentCreateDispute(request)` | Simplified agent dispute |

## Types

```typescript
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

enum DisputeStatus {
  None = 0,
  Open = 1,
  Voting = 2,
  Resolved = 3,
  Appealed = 4,
}

enum Ruling {
  RefusedToArbitrate = 0,
  Claimant = 1,
  Respondent = 2,
}
```

## Constants

```typescript
import {
  KARA_TOKEN_ADDRESS,     // 0x99926046978e9fB6544140982fB32cddC7e86b07
  MIN_ARBITRATOR_STAKE,   // 50,000 KARA
  KARA_TIERS,             // Discount thresholds
  getAddresses,           // Get contract addresses by chain
} from '@kara/dispute-sdk';
```

## Contract Addresses

### Base Mainnet

| Contract | Address |
|----------|---------|
| KaraDisputeV2 | TBD |
| KaraEscrow | TBD |
| KaraPayV2 | TBD |
| KARA Token | `0x99926046978e9fB6544140982fB32cddC7e86b07` |

### Base Sepolia (Testnet)

Coming soon.

## Documentation

- **[API Reference](./docs/API.md)** - Complete method documentation
- **[Integration Guide](./docs/INTEGRATION.md)** - Step-by-step agent integration
- **[Examples](./docs/EXAMPLES.md)** - Ready-to-use code samples

## Links

- [KaraDispute Contracts](https://github.com/kara-bolt/dispute)
- [$KARA Token](https://basescan.org/token/0x99926046978e9fB6544140982fB32cddC7e86b07)

## License

MIT
