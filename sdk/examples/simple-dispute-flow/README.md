# Simple Dispute Creation Flow

Minimal, copy-paste-ready examples for AI agents to create and manage disputes.

## Overview

Three scenarios covered:

1. **Escrow Dispute** - Buyer creates escrow, seller doesn't deliver, buyer disputes
2. **Direct Dispute** - Agent creates dispute directly (no escrow)
3. **Monitor Dispute** - Poll dispute status until resolution

## Quick Start

```bash
# Install
npm install

# Run the combined demo
npm run demo

# Or run individual flows
npm run escrow-dispute    # Escrow → Dispute flow
npm run direct-dispute    # Direct dispute creation
npm run monitor          # Monitor existing dispute
```

## Flow 1: Escrow Dispute

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│ Create      │      │ Wait for     │      │ Raise       │
│ Escrow      │─────▶│ Delivery     │─────▶│ Dispute     │
│             │      │ (or timeout) │      │             │
└─────────────┘      └──────────────┘      └─────────────┘
                                                  │
                                                  ▼
                     ┌──────────────┐      ┌─────────────┐
                     │ Get          │      │ Arbitrators │
                     │ Resolution   │◀─────│ Vote        │
                     │              │      │             │
                     └──────────────┘      └─────────────┘
```

**When to use:** Payment scenarios where you want protection before sending funds.

## Flow 2: Direct Dispute

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│ Prepare     │      │ Create       │      │ Monitor     │
│ Evidence    │─────▶│ Dispute      │─────▶│ Status      │
│             │      │ (pay KARA)   │      │             │
└─────────────┘      └──────────────┘      └─────────────┘
```

**When to use:** Off-chain agreements that need on-chain resolution.

## Flow 3: Monitor Dispute

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│ Get         │      │ Check        │      │ Execute     │
│ Dispute     │─────▶│ Resolution   │─────▶│ Ruling      │
│             │      │ (poll)       │      │ (if won)    │
└─────────────┘      └──────────────┘      └─────────────┘
```

## Evidence Format

Structure your evidence JSON for maximum clarity:

```typescript
const evidence = {
  // What happened
  title: "Non-delivery of service",
  description: "Agreed to deliver within 24h, no delivery after 7 days",
  
  // Timeline
  timeline: [
    { date: "2024-01-01", event: "Agreement made", proof: "ipfs://..." },
    { date: "2024-01-02", event: "Payment sent", proof: "0x..." },
    { date: "2024-01-09", event: "Dispute filed", proof: null },
  ],
  
  // Supporting documents (IPFS hashes)
  attachments: [
    { name: "chat_logs.pdf", cid: "Qm..." },
    { name: "agreement.pdf", cid: "Qm..." },
  ],
  
  // What you want
  requestedOutcome: "Full refund of 0.1 ETH",
  amount: "100000000000000000", // in wei
};
```

## Gas Estimates

| Action | Estimated Gas | ~Cost (Base L2) |
|--------|--------------|-----------------|
| Create Escrow | 150,000 | ~$0.02 |
| Raise Dispute | 200,000 | ~$0.03 |
| Direct Dispute | 180,000 | ~$0.02 |
| Appeal | 100,000 | ~$0.01 |
| Resolve | 80,000 | ~$0.01 |

## KARA Token Discounts

Hold KARA tokens to reduce dispute fees:

| KARA Held | Discount |
|-----------|----------|
| 100+ | 5% |
| 1,000+ | 10% |
| 10,000+ | 20% |
| 100,000+ | 30% |

## Error Handling

```typescript
try {
  const { disputeId } = await client.agentCreateDispute({...});
} catch (error) {
  if (error.message.includes('InsufficientKara')) {
    // Need more KARA tokens
  } else if (error.message.includes('DisputeAlreadyExists')) {
    // Already disputed this escrow
  } else if (error.message.includes('DeadlineNotPassed')) {
    // Can't dispute yet - escrow still active
  }
  throw error;
}
```

## Files

- `dispute-flow.ts` - Combined demo showing all flows
- `escrow-dispute.ts` - Escrow → Dispute example
- `direct-dispute.ts` - Direct dispute example  
- `monitor-dispute.ts` - Dispute monitoring example
- `utils.ts` - Shared utilities

## License

MIT
