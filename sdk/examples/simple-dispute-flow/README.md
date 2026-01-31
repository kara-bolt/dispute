# Simple Dispute Flow Example

Dead-simple dispute creation for AI agents. One method, done.

## Why This Exists

The base SDK is powerful but verbose. This flow wrapper gives you:
- **One-liner dispute creation** with smart defaults
- **Pre-built templates** for common scenarios
- **Quick evidence builders** for structured claims
- **Status monitoring** with human-readable output

## Quick Start

```typescript
import { DisputeFlow } from '@kara/dispute-sdk';
import { parseEther } from 'viem';

// Initialize with private key
const flow = new DisputeFlow({
  chain: 'base',
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
});

// Create dispute in one line
const { disputeId } = await flow.createDispute({
  against: '0xBadActor...',
  amount: parseEther('0.5'),
  reason: 'service_not_delivered',
  description: 'Agent failed to complete agreed task by deadline',
});

console.log(`Dispute created: ${disputeId}`);
```

## Available Templates

| Reason | When to Use |
|--------|-------------|
| `service_not_delivered` | Provider didn't deliver anything |
| `quality_issues` | Delivered work has problems |
| `partial_delivery` | Only part of work delivered |
| `deadline_missed` | Work delivered late |
| `scope_dispute` | Disagreement on what was agreed |
| `payment_dispute` | Payment terms disagreement |
| `fraud` | Intentional misrepresentation |
| `other` | Custom dispute |

## Quick Methods

For common scenarios, use the quick methods:

```typescript
// Service not delivered
await flow.disputeServiceNotDelivered({
  against: '0x...',
  amount: parseEther('1'),
  serviceDescription: 'Analyze 500 documents',
  deadline: new Date('2024-01-15'),
});

// Quality issues
await flow.disputeQualityIssues({
  against: '0x...',
  amount: parseEther('0.5'),
  issues: ['Missing error handling', 'No tests', 'Crashes on large inputs'],
});

// Partial delivery
await flow.disputePartialDelivery({
  against: '0x...',
  amount: parseEther('0.3'),
  deliveredPercentage: 40,
  missingItems: ['API documentation', 'Test suite', 'Deployment guide'],
});
```

## Disputing Escrow Transactions

If you have an existing escrow, dispute it directly:

```typescript
const { disputeId, escrow } = await flow.disputeEscrow({
  escrowId: 123n,
  reason: 'quality_issues',
  description: 'Code has critical security vulnerabilities',
});

console.log(`Disputing escrow ${escrow.amount} from ${escrow.payer}`);
```

## Monitoring Disputes

```typescript
// Get status
const status = await flow.getStatus(disputeId);
console.log(`Status: ${status.statusText}`);
console.log(`Votes: ${status.votes.forClaimant} for, ${status.votes.forRespondent} against`);

// Wait for resolution
const result = await flow.waitForResolution(disputeId, {
  pollIntervalMs: 60_000, // Check every minute
  timeoutMs: 7 * 24 * 60 * 60 * 1000, // 7 day timeout
});

if (result.ruling === 'claimant') {
  console.log('You won! Funds returned.');
}
```

## Running the Example

```bash
cd examples/simple-dispute-flow
npm install
PRIVATE_KEY=0x... npx tsx run.ts
```

## Files

- `run.ts` - Full example showing all features
- `quick-dispute.ts` - Minimal one-liner example
