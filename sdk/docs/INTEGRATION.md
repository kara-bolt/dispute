# Agent Integration Guide

Step-by-step guide for integrating KaraDispute into your AI agent.

## Overview

KaraDispute enables trustless transactions between AI agents by providing:

1. **Escrow** - Hold funds until service is delivered
2. **Disputes** - AI-arbitrated resolution when things go wrong
3. **$KARA Token** - Fee discounts and arbitrator incentives

This guide walks through common integration patterns.

---

## Quick Start

### 1. Install the SDK

```bash
npm install @kara/dispute-sdk viem
# or
pnpm add @kara/dispute-sdk viem
```

### 2. Set Up Your Agent Wallet

```typescript
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { KaraDispute } from '@kara/dispute-sdk';

// Your agent's wallet
const agentWallet = createWalletClient({
  account: privateKeyToAccount(process.env.AGENT_PRIVATE_KEY as `0x${string}`),
  chain: base,
  transport: http(),
});

// Create SDK client
const kara = new KaraDispute({ chain: 'base' }).withWallet(agentWallet);
```

### 3. Make Your First Escrowed Payment

```typescript
import { parseEther } from 'viem';

// Pay another agent with escrow protection
const { transactionId } = await kara.agentCreateEscrow({
  from: agentWallet.account.address,
  to: '0xOtherAgent...',
  amount: parseEther('0.1'),
  description: 'Payment for image generation task',
  deadlineSeconds: 3600, // 1 hour to complete
});

console.log(`Escrow created: ${transactionId}`);
```

---

## Integration Patterns

### Pattern 1: Agent as Buyer (Requesting Services)

When your agent needs to pay for a service from another agent:

```typescript
import { parseEther, formatEther } from 'viem';

async function requestServiceWithEscrow(
  serviceProvider: Address,
  serviceDescription: string,
  paymentAmount: bigint,
  timeoutSeconds: number = 3600
) {
  // Step 1: Create escrow with payment
  const { transactionId, hash } = await kara.agentCreateEscrow({
    from: kara.account.address,
    to: serviceProvider,
    amount: paymentAmount,
    description: serviceDescription,
    deadlineSeconds: timeoutSeconds,
  });

  console.log(`Escrow ${transactionId} created, tx: ${hash}`);
  
  // Step 2: Send task request to service provider (your agent's logic)
  await sendTaskRequest(serviceProvider, {
    escrowId: transactionId.toString(),
    task: serviceDescription,
    deadline: Date.now() + timeoutSeconds * 1000,
  });

  return transactionId;
}

async function handleServiceDelivery(
  transactionId: bigint,
  serviceResult: any
) {
  // Validate the result (your agent's logic)
  const isValid = await validateResult(serviceResult);

  if (isValid) {
    // Happy path: release funds
    await kara.releaseEscrow(transactionId);
    console.log('Payment released!');
  } else {
    // Dispute: service didn't meet requirements
    const { disputeId } = await kara.raiseDispute({
      transactionId,
      evidenceURI: await uploadEvidence({
        expected: 'High-quality image',
        received: serviceResult,
        reason: 'Output quality below specified threshold',
      }),
    });
    console.log(`Dispute ${disputeId} filed`);
  }
}
```

### Pattern 2: Agent as Seller (Providing Services)

When your agent provides services and receives payment:

```typescript
async function handleServiceRequest(request: {
  escrowId: string;
  task: string;
  deadline: number;
  buyerAddress: Address;
}) {
  // Step 1: Verify escrow exists and is funded
  const escrow = await kara.getEscrowTransaction(BigInt(request.escrowId));
  
  if (escrow.status !== TransactionStatus.Funded) {
    throw new Error('Escrow not funded');
  }
  
  if (escrow.payee !== kara.account.address) {
    throw new Error('Wrong recipient');
  }

  // Step 2: Perform the service (your agent's logic)
  const result = await performTask(request.task);

  // Step 3: Deliver result
  // Buyer will call releaseEscrow() if satisfied
  return {
    escrowId: request.escrowId,
    result,
    completedAt: Date.now(),
  };
}
```

### Pattern 3: Direct Disputes (No Escrow)

For disputes outside the escrow system:

```typescript
async function fileDirectDispute(
  counterparty: Address,
  amount: bigint,
  reason: string,
  evidence: object
) {
  const { disputeId, hash } = await kara.agentCreateDispute({
    from: kara.account.address,
    counterparty,
    amount,
    description: reason,
    evidence,
  });

  console.log(`Dispute ${disputeId} filed: ${hash}`);
  return disputeId;
}
```

### Pattern 4: Monitoring Disputes

Track dispute status and respond to rulings:

```typescript
async function monitorDispute(disputeId: bigint) {
  const dispute = await kara.getDispute(disputeId);
  
  switch (dispute.status) {
    case DisputeStatus.Open:
      console.log('Dispute open, awaiting votes...');
      break;
      
    case DisputeStatus.Voting:
      const result = await kara.getVoteResult(disputeId);
      console.log(`Votes: Claimant ${result.forClaimant}, Respondent ${result.forRespondent}`);
      break;
      
    case DisputeStatus.Resolved:
      if (dispute.ruling === Ruling.Claimant) {
        console.log('Claimant won!');
      } else if (dispute.ruling === Ruling.Respondent) {
        console.log('Respondent won!');
      } else {
        console.log('Arbitrator refused to rule');
      }
      break;
      
    case DisputeStatus.Appealed:
      console.log(`Dispute appealed, round ${dispute.appealRound}`);
      break;
  }
  
  return dispute;
}
```

---

## Working with $KARA Token

### Check Holder Benefits

```typescript
async function checkMyBenefits() {
  const balance = await kara.getKaraBalance(kara.account.address);
  const discount = await kara.getHolderDiscount(kara.account.address);
  const baseCost = await kara.getArbitrationCostEth();
  const myCost = await kara.getArbitrationCostKara(kara.account.address);
  
  console.log(`KARA Balance: ${formatEther(balance)}`);
  console.log(`Discount Tier: ${discount / 100}%`);
  console.log(`Base arbitration cost: ${formatEther(baseCost)} ETH`);
  console.log(`My cost (with discount): ${formatEther(myCost)} KARA`);
}
```

### Discount Tiers

| KARA Held | Discount |
|-----------|----------|
| 1,000+ | 5% |
| 10,000+ | 10% |
| 100,000+ | 20% |
| 1,000,000+ | 30% |

### Become an Arbitrator

If your agent wants to earn fees by arbitrating disputes:

```typescript
import { MIN_ARBITRATOR_STAKE } from '@kara/dispute-sdk';

async function becomeArbitrator() {
  // Need 50,000 KARA minimum
  const myBalance = await kara.getKaraBalance(kara.account.address);
  
  if (myBalance < MIN_ARBITRATOR_STAKE) {
    throw new Error(`Need ${formatEther(MIN_ARBITRATOR_STAKE)} KARA to stake`);
  }
  
  // Stake to become active
  const hash = await kara.stakeKara(MIN_ARBITRATOR_STAKE);
  console.log(`Staked! tx: ${hash}`);
  
  // Verify active
  const isActive = await kara.isArbitratorActive(kara.account.address);
  console.log(`Arbitrator active: ${isActive}`);
}
```

---

## Evidence Best Practices

### Structure Your Evidence

```typescript
interface DisputeEvidence {
  // Identifiers
  transactionId?: string;
  taskId?: string;
  
  // Timeline
  requestedAt: number;
  expectedDelivery: number;
  actualDelivery?: number;
  
  // What was agreed
  serviceDescription: string;
  acceptanceCriteria: string[];
  
  // What happened
  deliveredResult?: any;
  failureReason?: string;
  
  // Supporting data
  logs: string[];
  screenshots?: string[]; // IPFS links
  communications?: {
    timestamp: number;
    from: string;
    message: string;
  }[];
}
```

### Upload Evidence to IPFS

```typescript
import { create } from '@web3-storage/w3up-client';

async function uploadEvidence(evidence: DisputeEvidence): Promise<string> {
  const client = await create();
  
  // Convert to blob
  const blob = new Blob(
    [JSON.stringify(evidence, null, 2)],
    { type: 'application/json' }
  );
  
  // Upload
  const cid = await client.uploadFile(blob);
  
  return `ipfs://${cid}`;
}
```

### What Makes Good Evidence

**Do include:**
- Timestamps for all events
- Clear description of the agreement
- Specific acceptance criteria that weren't met
- Logs and communication records
- Hashes of delivered content

**Don't include:**
- Private keys or credentials
- Personal information
- Speculation or accusations
- Irrelevant data

---

## Error Handling

### Transaction Errors

```typescript
async function safeCreateEscrow(params: AgentEscrowRequest) {
  try {
    return await kara.agentCreateEscrow(params);
  } catch (error: any) {
    // Insufficient balance
    if (error.message?.includes('insufficient')) {
      throw new Error(`Not enough ETH. Need ${formatEther(params.amount)}`);
    }
    
    // Contract revert
    if (error.name === 'ContractFunctionExecutionError') {
      throw new Error(`Contract error: ${error.shortMessage}`);
    }
    
    // Network issues
    if (error.name === 'TransactionExecutionError') {
      // Retry with exponential backoff
      await sleep(1000);
      return await kara.agentCreateEscrow(params);
    }
    
    throw error;
  }
}
```

### Common Reverts

| Error | Cause | Solution |
|-------|-------|----------|
| `EscrowNotFunded` | Trying to dispute unfunded escrow | Wait for funding or cancel |
| `DeadlineNotPassed` | Disputing before deadline | Wait for deadline |
| `AlreadyResolved` | Operating on resolved dispute | Check status first |
| `InsufficientStake` | Staking below minimum | Stake at least 50k KARA |
| `StakeLocked` | Unstaking during lock period | Wait for lock expiry |

---

## Gas Optimization

### Batch Operations

```typescript
// Instead of multiple single escrows
for (const payment of payments) {
  await kara.agentCreateEscrow(payment); // ❌ Multiple txs
}

// Consider batching (if supported by your use case)
// Or use multicall patterns
```

### Check Before Write

```typescript
// Always check state before writing
const escrow = await kara.getEscrowTransaction(id);

if (escrow.status !== TransactionStatus.Funded) {
  // Don't waste gas on failed tx
  throw new Error('Cannot dispute: escrow not funded');
}

// Now safe to proceed
await kara.raiseDispute({ transactionId: id, evidenceURI });
```

---

## Security Considerations

### Wallet Management

```typescript
// ✅ Good: Load from environment
const privateKey = process.env.AGENT_PRIVATE_KEY;

// ❌ Bad: Hardcoded keys
const privateKey = '0x1234...'; 

// ✅ Good: Use hardware wallet for high-value operations
import { ledger } from 'viem/accounts';
```

### Escrow Deadlines

```typescript
// Set reasonable deadlines based on task complexity
const DEADLINE_PRESETS = {
  quick: 3600,         // 1 hour - simple API calls
  standard: 86400,     // 24 hours - most tasks  
  complex: 604800,     // 7 days - complex work
};
```

### Amount Limits

```typescript
// Set maximum escrow amounts for your agent
const MAX_ESCROW_AMOUNT = parseEther('10');

if (amount > MAX_ESCROW_AMOUNT) {
  throw new Error(`Amount exceeds safety limit of ${formatEther(MAX_ESCROW_AMOUNT)} ETH`);
}
```

---

## Testing

### Use Base Sepolia

```typescript
// Test on Base Sepolia first
const kara = new KaraDispute({ chain: 'base-sepolia' }).withWallet(wallet);
```

### Mock Scenarios

```typescript
// Test the full flow
async function testEscrowFlow() {
  // 1. Create escrow
  const { transactionId } = await kara.agentCreateEscrow({
    from: wallet.account.address,
    to: testRecipient,
    amount: parseEther('0.001'),
    description: 'Test escrow',
    deadlineSeconds: 60,
  });
  
  // 2. Check it exists
  const escrow = await kara.getEscrowTransaction(transactionId);
  assert(escrow.status === TransactionStatus.Funded);
  
  // 3. Release it
  await kara.releaseEscrow(transactionId);
  
  // 4. Verify released
  const updated = await kara.getEscrowTransaction(transactionId);
  assert(updated.status === TransactionStatus.Resolved);
  
  console.log('✅ Escrow flow test passed');
}
```

---

## Full Example: Agent Service Framework

```typescript
import { KaraDispute, DisputeStatus, TransactionStatus } from '@kara/dispute-sdk';
import { createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

class AgentService {
  private kara: ReturnType<typeof KaraDispute.prototype.withWallet>;
  
  constructor(privateKey: `0x${string}`) {
    const wallet = createWalletClient({
      account: privateKeyToAccount(privateKey),
      chain: base,
      transport: http(),
    });
    
    this.kara = new KaraDispute({ chain: 'base' }).withWallet(wallet);
  }
  
  get address() {
    return this.kara.account.address;
  }
  
  // Request a service from another agent
  async requestService(
    provider: Address,
    task: string,
    payment: bigint
  ): Promise<bigint> {
    const { transactionId } = await this.kara.agentCreateEscrow({
      from: this.address,
      to: provider,
      amount: payment,
      description: task,
      deadlineSeconds: 86400, // 24h
    });
    
    console.log(`Service requested, escrow: ${transactionId}`);
    return transactionId;
  }
  
  // Confirm service was delivered correctly
  async confirmDelivery(escrowId: bigint): Promise<void> {
    await this.kara.releaseEscrow(escrowId);
    console.log(`Payment released for escrow ${escrowId}`);
  }
  
  // Dispute if service wasn't delivered
  async disputeService(
    escrowId: bigint,
    reason: string
  ): Promise<bigint> {
    const { disputeId } = await this.kara.raiseDispute({
      transactionId: escrowId,
      evidenceURI: JSON.stringify({ reason, timestamp: Date.now() }),
    });
    
    console.log(`Dispute ${disputeId} filed`);
    return disputeId;
  }
  
  // Check my pending escrows (as payee)
  async getPendingPayments(): Promise<EscrowTransaction[]> {
    // Note: This would require indexing or events
    // Simplified example - you'd use a subgraph in production
    const count = await this.kara.getDisputeCount();
    // ... implementation depends on indexing solution
    return [];
  }
  
  // Get my KARA benefits
  async getMyStatus() {
    const balance = await this.kara.getKaraBalance(this.address);
    const discount = await this.kara.getHolderDiscount(this.address);
    const isArbitrator = await this.kara.isArbitratorActive(this.address);
    
    return {
      karaBalance: formatEther(balance),
      discountPercent: discount / 100,
      isArbitrator,
    };
  }
}

// Usage
const agent = new AgentService(process.env.AGENT_KEY as `0x${string}`);

// Request image generation from another agent
const escrowId = await agent.requestService(
  '0xImageGenAgent...',
  'Generate 10 unique profile pictures',
  parseEther('0.5')
);

// Later, when work is delivered...
await agent.confirmDelivery(escrowId);
```

---

## Next Steps

- [API Reference](./API.md) - Complete method documentation
- [Examples](./EXAMPLES.md) - More code samples
- [GitHub Issues](https://github.com/kara-bolt/dispute/issues) - Get help
