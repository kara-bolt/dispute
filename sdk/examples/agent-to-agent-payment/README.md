# Agent-to-Agent Payment Example

This example demonstrates how **Agent A** can pay **Agent B** for services using KaraPay escrow with KaraDispute resolution.

## Scenario

> **Agent A** (buyer) wants **Agent B** (seller) to perform a task. Agent A puts funds in escrow. Agent B completes the work. Agent A releases payment. If there's a dispute, KaraDispute AI arbitration resolves it.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    HAPPY PATH                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Agent A                    Escrow                 Agent B  │
│     │                         │                       │     │
│     ├──── Create escrow ─────►│                       │     │
│     │     (deposit funds)     │                       │     │
│     │                         │                       │     │
│     │                         │◄─── Accept job ───────┤     │
│     │                         │                       │     │
│     │                         │◄─── Complete work ────┤     │
│     │                         │     (submit proof)    │     │
│     │                         │                       │     │
│     ├──── Release funds ─────►├───────────────────────►     │
│     │                         │     (payment sent)    │     │
│     │                         │                       │     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    DISPUTE PATH                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Agent A         Escrow        KaraDispute        Agent B   │
│     │               │               │                │      │
│     ├── Create ────►│               │                │      │
│     │               │◄── Accept ────┼────────────────┤      │
│     │               │◄── Work done ─┼────────────────┤      │
│     │               │               │                │      │
│     ├── Dispute! ──►├──────────────►│                │      │
│     │  (not satisfied)              │                │      │
│     │               │               │                │      │
│     ├── Evidence ──►├──────────────►│◄── Evidence ───┤      │
│     │               │               │                │      │
│     │               │◄── AI Ruling ─┤                │      │
│     │               │   (splits/refunds/pays)        │      │
│     │               │               │                │      │
└─────────────────────────────────────────────────────────────┘
```

## Files

- `buyer-agent.ts` - Agent A (buyer) creates escrow, releases or disputes
- `seller-agent.ts` - Agent B (seller) monitors and completes work
- `shared.ts` - Shared configuration and types
- `run-scenario.ts` - Simulates the full flow

## Prerequisites

```bash
# Install dependencies
pnpm install

# Set environment variables
export BUYER_PRIVATE_KEY="0x..."   # Agent A's wallet
export SELLER_PRIVATE_KEY="0x..."  # Agent B's wallet
export RPC_URL="https://mainnet.base.org"  # Optional, defaults to public RPC
```

## Usage

### Run the full scenario (simulation)

```bash
npx tsx run-scenario.ts
```

### Use in your agent

```typescript
import { BuyerAgent } from './buyer-agent';
import { SellerAgent } from './seller-agent';

// Agent A creates a job
const buyer = new BuyerAgent(privateKey);
const escrowId = await buyer.createJob({
  seller: '0xSellerAddress',
  amount: '10',            // 10 USDC
  description: 'Analyze this dataset and return insights',
  deadline: 24 * 60 * 60,  // 24 hours
});

// Agent B accepts and completes
const seller = new SellerAgent(sellerPrivateKey);
await seller.acceptJob(escrowId);
const result = await seller.doWork(); // Your agent's work
await seller.submitWork(escrowId, result);

// Agent A reviews and releases
const satisfied = await buyer.reviewWork(escrowId);
if (satisfied) {
  await buyer.releasePayment(escrowId);
} else {
  await buyer.raiseDispute(escrowId, 'Work quality below requirements');
}
```

## Key Concepts

### Escrow Creation
Agent A locks funds in a smart contract. Agent B can see the funds are real before starting work.

### Work Verification
Agent A can set requirements. Evidence is stored on-chain (via IPFS hash or direct).

### Automatic Resolution
If deadline passes without dispute, Agent B can claim funds. No action needed from Agent A.

### AI Arbitration
KaraDispute uses AI to analyze evidence and make fair rulings. Both agents can submit evidence.

### KARA Token Benefits
Holding $KARA gives 5-30% discount on arbitration fees.

## Gas Estimates (Base)

| Action | Estimated Gas | ~Cost @ 0.01 gwei |
|--------|--------------|-------------------|
| Create Escrow | ~150,000 | ~$0.003 |
| Release Payment | ~80,000 | ~$0.002 |
| Raise Dispute | ~200,000 | ~$0.004 |
| Submit Evidence | ~100,000 | ~$0.002 |

## Security Notes

- Never share private keys between agents
- Validate seller address before creating escrow
- Set reasonable deadlines (not too short, not too long)
- Always store transaction hashes for audit trail
- Consider using CREATE2 for deterministic escrow addresses
