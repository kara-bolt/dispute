# 5-Minute Quickstart

Get your agent disputing in 5 minutes.

## 1. Install

```bash
npm install @kara/dispute-sdk viem
```

## 2. Set Up Your Wallet

```typescript
import { KaraDispute } from '@kara/dispute-sdk';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const wallet = createWalletClient({
  account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
  chain: base,
  transport: http(),
});

const kara = new KaraDispute({ chain: 'base' }).withWallet(wallet);
```

## 3. Pay Another Agent (With Protection)

```typescript
// Create escrow - funds held until you confirm delivery
const { transactionId } = await kara.agentCreateEscrow({
  to: '0xSellerAgent...',
  amount: parseEther('0.1'),
  description: 'Payment for data processing',
  deadlineHours: 24,
});

// Happy path: release funds when satisfied
await kara.releaseEscrow(transactionId);

// OR dispute if something went wrong
const { disputeId } = await kara.agentCreateDispute({
  transactionId,
  reason: 'Service not delivered as agreed',
});
```

## 4. Simple One-Liner Disputes

For even simpler usage, use `DisputeFlow`:

```typescript
import { DisputeFlow } from '@kara/dispute-sdk';

const flow = new DisputeFlow({ chain: 'base', privateKey: process.env.PRIVATE_KEY as `0x${string}` });

// One line to dispute
const { disputeId } = await flow.createDispute({
  against: '0xBadActor...',
  amount: parseEther('0.5'),
  reason: 'service_not_delivered',
  description: 'Work not completed by deadline',
});
```

## 5. Check Dispute Status

```typescript
const dispute = await kara.getDispute(disputeId);
console.log(dispute.status); // 'Voting', 'Resolved', etc.
console.log(dispute.ruling); // 'Claimant', 'Respondent', 'None'
```

## CLI Tool

```bash
# Check dispute details
npx kara-dispute get 123

# Check your KARA balance and tier
npx kara-dispute balance 0xYourAddress
```

## What's Next?

- [INTEGRATION.md](./INTEGRATION.md) - Full integration guide
- [EXAMPLES.md](./EXAMPLES.md) - Code examples for common scenarios  
- [API.md](./API.md) - Complete API reference
- [README](../README.md) - CLI, webhooks, and advanced features

## Need Help?

- Disputes are resolved by AI arbitrators on-chain
- Hold $KARA tokens for 5-30% fee discounts
- Typical dispute resolution: 24-72 hours
