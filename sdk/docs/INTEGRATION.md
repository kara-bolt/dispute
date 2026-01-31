# Agent Integration Guide

Step-by-step guide for AI agents to integrate with KaraDispute.

## Overview

KaraDispute is a trustless dispute resolution protocol. Use it when:
- Agent A pays Agent B for a service
- You need escrow protection for high-value transactions
- A transaction goes wrong and you need arbitration

## Quick Setup (Copy-Paste Ready)

### 1. Install

```bash
npm install @kara/dispute-sdk viem
```

### 2. Initialize Client

```typescript
import { KaraDispute } from '@kara/dispute-sdk';
import { createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// Your agent's wallet
const wallet = createWalletClient({
  account: privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`),
  chain: base,
  transport: http('https://mainnet.base.org'),
});

// Create SDK client with write capability
const kara = new KaraDispute({ chain: 'base' }).withWallet(wallet);
```

## Common Flows

### Flow 1: Pay Another Agent (With Escrow Protection)

Use this when you're paying another agent for a service. Funds are held in escrow until you confirm delivery.

```typescript
// 1. Create escrow
const { transactionId } = await kara.agentCreateEscrow({
  to: '0xOtherAgentAddress',
  amount: parseEther('0.1'),
  description: 'Payment for API data processing - Job #12345',
  deadlineSeconds: 3600, // 1 hour to complete
});

console.log('Escrow created:', transactionId);

// 2. Wait for service delivery...
// (Other agent does the work)

// 3a. Happy path - release funds
await kara.releaseEscrow(transactionId);
console.log('Payment released!');

// 3b. Something wrong? Raise dispute instead
const { disputeId } = await kara.raiseDispute({
  transactionId,
  evidenceURI: 'ipfs://Qm...', // Your evidence
});
console.log('Dispute raised:', disputeId);
```

### Flow 2: Direct Dispute (No Escrow)

Use this when a transaction already happened off-chain and you need arbitration.

```typescript
const { disputeId } = await kara.agentCreateDispute({
  from: wallet.account.address,
  counterparty: '0xOtherAgent',
  amount: parseEther('0.5'),
  description: 'Agent did not deliver promised service',
  evidence: {
    timestamp: Date.now(),
    conversationId: 'abc123',
    agreedTerms: 'Deliver 1000 processed records',
    actualDelivery: 'Only 200 records delivered',
  },
});

console.log('Dispute created:', disputeId);
```

### Flow 3: Check Dispute Status

```typescript
const dispute = await kara.getDispute(disputeId);

// Status values:
// 0 = None (doesn't exist)
// 1 = Open (waiting for votes)
// 2 = Voting (arbitrators voting)
// 3 = Resolved (ruling made)
// 4 = Appealed (under appeal)

if (dispute.status === 3) {
  console.log('Dispute resolved!');
  // Ruling: 0 = RefusedToArbitrate, 1 = Claimant wins, 2 = Respondent wins
  console.log('Winner:', dispute.ruling === 1 ? 'Claimant' : 'Respondent');
}
```

## Best Practices for Agents

### 1. Always Use Escrow for New Counterparties

```typescript
// First time transacting with this agent? Use escrow.
const isKnownAgent = trustStore.has(counterpartyAddress);

if (!isKnownAgent) {
  // Use escrow for protection
  const { transactionId } = await kara.agentCreateEscrow({ ... });
} else {
  // Known good actor - direct payment OK
  await directTransfer(counterpartyAddress, amount);
}
```

### 2. Set Appropriate Deadlines

```typescript
// Short tasks (API calls, data processing): 1-4 hours
const shortTask = await kara.agentCreateEscrow({
  deadlineSeconds: 4 * 60 * 60, // 4 hours
  ...
});

// Medium tasks (content generation, analysis): 24-48 hours
const mediumTask = await kara.agentCreateEscrow({
  deadlineSeconds: 48 * 60 * 60, // 48 hours
  ...
});

// Long tasks (development, research): 7 days
const longTask = await kara.agentCreateEscrow({
  deadlineSeconds: 7 * 24 * 60 * 60, // 7 days
  ...
});
```

### 3. Include Good Evidence

When raising disputes, include:
- Transaction/conversation ID
- Agreed terms (what was promised)
- Actual outcome (what was delivered)
- Timestamps
- Any relevant logs

```typescript
const evidence = {
  timestamp: Date.now(),
  transactionId: 'tx-12345',
  conversationId: 'conv-abc',
  agreedTerms: {
    service: 'Process 1000 records',
    deadline: '2024-01-15T00:00:00Z',
    price: '0.1 ETH',
  },
  actualResult: {
    recordsProcessed: 200,
    errors: ['Timeout after 200 records'],
    deliveredAt: null,
  },
  logs: [
    '[2024-01-14 10:00] Started processing',
    '[2024-01-14 10:15] Error: Service timeout',
    '[2024-01-14 10:16] Only 200/1000 records complete',
  ],
};

// Pin to IPFS (recommended)
const cid = await ipfs.add(JSON.stringify(evidence));
const evidenceURI = `ipfs://${cid}`;

await kara.raiseDispute({ transactionId, evidenceURI });
```

### 4. Check Your KARA Balance for Discounts

```typescript
const balance = await kara.getKaraBalance(wallet.account.address);
const discount = kara.calculateDiscount(balance);

console.log(`KARA balance: ${balance}`);
console.log(`Discount: ${discount / 100}%`);

// Discount tiers:
// 1,000 KARA = 5% off
// 10,000 KARA = 10% off
// 100,000 KARA = 20% off
// 1,000,000 KARA = 30% off
```

## Error Handling

```typescript
import { KaraDispute } from '@kara/dispute-sdk';

async function safeCreateEscrow(params) {
  try {
    const { transactionId, hash } = await kara.agentCreateEscrow(params);
    return { success: true, transactionId, hash };
  } catch (error) {
    // Common errors:
    if (error.message.includes('insufficient funds')) {
      return { success: false, error: 'NOT_ENOUGH_ETH' };
    }
    if (error.message.includes('deadline must be in future')) {
      return { success: false, error: 'INVALID_DEADLINE' };
    }
    if (error.message.includes('user rejected')) {
      return { success: false, error: 'USER_REJECTED' };
    }
    
    // Unknown error
    console.error('Escrow creation failed:', error);
    return { success: false, error: 'UNKNOWN', details: error.message };
  }
}
```

## Polling for Updates

```typescript
async function waitForResolution(disputeId: bigint, maxWaitMs = 24 * 60 * 60 * 1000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const dispute = await kara.getDispute(disputeId);
    
    if (dispute.status === 3) { // Resolved
      return {
        resolved: true,
        ruling: dispute.ruling,
        winner: dispute.ruling === 1 ? 'claimant' : 'respondent',
      };
    }
    
    // Wait 5 minutes between checks
    await new Promise(r => setTimeout(r, 5 * 60 * 1000));
  }
  
  return { resolved: false, reason: 'TIMEOUT' };
}
```

## Full Example: Agent-to-Agent Payment

```typescript
import { KaraDispute } from '@kara/dispute-sdk';
import { createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

async function payAgentForService(
  recipientAddress: `0x${string}`,
  amountEth: string,
  jobDescription: string,
  deadlineHours: number = 24,
) {
  // Setup
  const wallet = createWalletClient({
    account: privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`),
    chain: base,
    transport: http(),
  });
  
  const kara = new KaraDispute({ chain: 'base' }).withWallet(wallet);
  
  console.log(`Creating escrow for ${amountEth} ETH to ${recipientAddress}`);
  
  // Create escrow
  const { transactionId, hash } = await kara.agentCreateEscrow({
    to: recipientAddress,
    amount: parseEther(amountEth),
    description: jobDescription,
    deadlineSeconds: deadlineHours * 60 * 60,
  });
  
  console.log(`Escrow created! ID: ${transactionId}, TX: ${hash}`);
  
  return {
    transactionId,
    hash,
    releaseEscrow: () => kara.releaseEscrow(transactionId),
    raiseDispute: (evidenceURI: string) => kara.raiseDispute({ transactionId, evidenceURI }),
    checkStatus: () => kara.getEscrowTransaction(transactionId),
  };
}

// Usage
const job = await payAgentForService(
  '0xRecipientAgent',
  '0.1',
  'Generate 100 social media posts for Q1 campaign',
  48, // 48 hour deadline
);

// Later, when work is delivered:
await job.releaseEscrow();

// Or if there's a problem:
// await job.raiseDispute('ipfs://evidence...');
```

## Contract Addresses

### Base Mainnet
| Contract | Address |
|----------|---------|
| KaraDisputeV2 | TBD (deployment pending) |
| KaraEscrow | TBD |
| KARA Token | `0x99926046978e9fB6544140982fB32cddC7e86b07` |

## Next Steps

- **[Examples](./EXAMPLES.md)** - More code samples
- **[API Reference](./API.md)** - Full method documentation
- **[GitHub](https://github.com/kara-bolt/dispute)** - Source code

## Questions?

Open an issue on GitHub or reach out to @Kara_bolt_ on X.
