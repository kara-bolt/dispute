# KaraDispute SDK Examples

Ready-to-use code samples for common agent integration patterns.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Escrow Patterns](#escrow-patterns)
3. [Dispute Patterns](#dispute-patterns)
4. [Monitoring & Webhooks](#monitoring--webhooks)
5. [Multi-Agent Coordination](#multi-agent-coordination)

---

## Basic Setup

### Minimal Setup

```typescript
import { KaraDispute } from '@kara/dispute-sdk';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const kara = new KaraDispute({ chain: 'base' }).withWallet(
  createWalletClient({
    account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
    chain: base,
    transport: http(),
  })
);
```

### With Custom RPC

```typescript
const kara = new KaraDispute({
  chain: 'base',
  rpcUrl: 'https://your-custom-rpc.com',
}).withWallet(wallet);
```

### Read-Only Client

```typescript
// No wallet needed for read operations
const kara = new KaraDispute({ chain: 'base' });

const dispute = await kara.getDispute(1n);
const balance = await kara.getKaraBalance('0x...');
```

---

## Escrow Patterns

### Simple Escrow for Service Payment

```typescript
import { parseEther } from 'viem';

async function createServiceEscrow(
  provider: `0x${string}`,
  amountEth: string,
  service: string,
) {
  const { transactionId, hash } = await kara.agentCreateEscrow({
    to: provider,
    amount: parseEther(amountEth),
    description: `Service: ${service}`,
    deadlineSeconds: 24 * 60 * 60, // 24 hours
  });

  return { transactionId, hash };
}

// Usage
const escrow = await createServiceEscrow(
  '0xProviderAgent',
  '0.05',
  'Analyze 500 documents and return summary',
);
```

### Escrow with Token Payment

```typescript
import { parseUnits } from 'viem';

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base

async function createUsdcEscrow(
  recipient: `0x${string}`,
  usdcAmount: string,
  description: string,
) {
  // Note: Must approve USDC first if using tokens
  return await kara.agentCreateEscrow({
    to: recipient,
    token: USDC,
    amount: parseUnits(usdcAmount, 6), // USDC has 6 decimals
    description,
    deadlineSeconds: 48 * 60 * 60,
  });
}
```

### Check Escrow Status

```typescript
async function getEscrowStatus(transactionId: bigint) {
  const tx = await kara.getEscrowTransaction(transactionId);
  
  const statusNames = ['Pending', 'Funded', 'Released', 'Disputed', 'Refunded'];
  
  return {
    id: tx.id,
    payer: tx.payer,
    payee: tx.payee,
    amount: tx.amount,
    status: statusNames[tx.status],
    deadline: new Date(Number(tx.deadline) * 1000),
    hasDispute: tx.disputeId > 0n,
  };
}
```

### Batch Escrow Creation

```typescript
async function createBatchEscrows(
  jobs: Array<{
    recipient: `0x${string}`;
    amount: bigint;
    description: string;
  }>,
) {
  const results = [];
  
  for (const job of jobs) {
    try {
      const result = await kara.agentCreateEscrow({
        to: job.recipient,
        amount: job.amount,
        description: job.description,
        deadlineSeconds: 24 * 60 * 60,
      });
      results.push({ ...job, success: true, ...result });
    } catch (error) {
      results.push({ ...job, success: false, error: error.message });
    }
  }
  
  return results;
}
```

---

## Dispute Patterns

### Raise Dispute with Evidence

```typescript
async function raiseDisputeWithEvidence(
  transactionId: bigint,
  evidence: {
    issue: string;
    expected: string;
    actual: string;
    logs?: string[];
  },
) {
  // In production, pin to IPFS
  const evidenceJSON = JSON.stringify({
    ...evidence,
    timestamp: new Date().toISOString(),
    disputedBy: kara.account.address,
  });
  
  // For now, use data URI (in production: pin to IPFS)
  const evidenceURI = `data:application/json,${encodeURIComponent(evidenceJSON)}`;
  
  return await kara.raiseDispute({
    transactionId,
    evidenceURI,
  });
}

// Usage
const dispute = await raiseDisputeWithEvidence(123n, {
  issue: 'Incomplete delivery',
  expected: '1000 processed records',
  actual: '200 records with errors',
  logs: [
    '2024-01-15 10:00 - Job started',
    '2024-01-15 10:30 - Error: timeout',
    '2024-01-15 10:31 - Only 200 records complete',
  ],
});
```

### Create Direct Dispute

```typescript
async function createDirectDispute(
  counterparty: `0x${string}`,
  amountInDispute: bigint,
  reason: string,
) {
  return await kara.agentCreateDispute({
    from: kara.account.address,
    counterparty,
    amount: amountInDispute,
    description: reason,
    evidence: {
      timestamp: Date.now(),
      type: 'direct-dispute',
      reason,
    },
  });
}
```

### Appeal a Ruling

```typescript
async function appealIfUnfavorable(disputeId: bigint) {
  const dispute = await kara.getDispute(disputeId);
  
  // Only appeal if we're the losing party
  const weAreClaimant = dispute.claimant.toLowerCase() === kara.account.address.toLowerCase();
  const weLost = (weAreClaimant && dispute.ruling === 2) || 
                 (!weAreClaimant && dispute.ruling === 1);
  
  if (dispute.status === 3 && weLost) {
    console.log('Ruling unfavorable, filing appeal...');
    return await kara.appealWithKara(disputeId);
  }
  
  return null;
}
```

---

## Monitoring & Webhooks

### Poll for Dispute Resolution

```typescript
async function monitorDispute(
  disputeId: bigint,
  onResolved: (ruling: number) => void,
  pollIntervalMs = 5 * 60 * 1000,
) {
  const checkStatus = async () => {
    const dispute = await kara.getDispute(disputeId);
    
    if (dispute.status === 3) { // Resolved
      onResolved(dispute.ruling);
      return true;
    }
    
    return false;
  };
  
  // Check immediately
  if (await checkStatus()) return;
  
  // Then poll
  const interval = setInterval(async () => {
    if (await checkStatus()) {
      clearInterval(interval);
    }
  }, pollIntervalMs);
  
  return () => clearInterval(interval);
}

// Usage
monitorDispute(123n, (ruling) => {
  console.log(`Dispute resolved! Ruling: ${ruling}`);
  if (ruling === 1) {
    console.log('We won!');
  } else {
    console.log('We lost, consider appeal');
  }
});
```

### Track Multiple Escrows

```typescript
class EscrowTracker {
  private escrows: Map<bigint, { status: number; lastChecked: number }> = new Map();
  
  constructor(private kara: KaraDisputeWriter) {}
  
  async track(transactionId: bigint) {
    const tx = await this.kara.getEscrowTransaction(transactionId);
    this.escrows.set(transactionId, {
      status: tx.status,
      lastChecked: Date.now(),
    });
  }
  
  async checkAll() {
    const updates = [];
    
    for (const [id, cached] of this.escrows) {
      const tx = await this.kara.getEscrowTransaction(id);
      
      if (tx.status !== cached.status) {
        updates.push({
          transactionId: id,
          oldStatus: cached.status,
          newStatus: tx.status,
        });
        this.escrows.set(id, { status: tx.status, lastChecked: Date.now() });
      }
    }
    
    return updates;
  }
}
```

---

## Multi-Agent Coordination

### Agent Payment Pipeline

```typescript
/**
 * Coordinate payment between multiple agents in a pipeline.
 * Agent A -> Agent B -> Agent C (each step protected by escrow)
 */
async function createPipeline(
  steps: Array<{
    agent: `0x${string}`;
    amount: bigint;
    task: string;
  }>,
) {
  const pipeline = [];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const { transactionId } = await kara.agentCreateEscrow({
      to: step.agent,
      amount: step.amount,
      description: `Pipeline step ${i + 1}: ${step.task}`,
      deadlineSeconds: (i + 1) * 24 * 60 * 60, // Each step gets +1 day
    });
    
    pipeline.push({
      step: i + 1,
      agent: step.agent,
      transactionId,
      task: step.task,
    });
  }
  
  return pipeline;
}

// Usage
const pipeline = await createPipeline([
  { agent: '0xDataAgent', amount: parseEther('0.02'), task: 'Collect raw data' },
  { agent: '0xProcessAgent', amount: parseEther('0.03'), task: 'Process and clean' },
  { agent: '0xAnalysisAgent', amount: parseEther('0.05'), task: 'Generate insights' },
]);
```

### Trust Score Helper

```typescript
/**
 * Track agent reliability based on dispute history
 */
class AgentTrustScore {
  private scores: Map<string, { completed: number; disputed: number }> = new Map();
  
  recordCompletion(agent: `0x${string}`) {
    const key = agent.toLowerCase();
    const current = this.scores.get(key) || { completed: 0, disputed: 0 };
    current.completed++;
    this.scores.set(key, current);
  }
  
  recordDispute(agent: `0x${string}`) {
    const key = agent.toLowerCase();
    const current = this.scores.get(key) || { completed: 0, disputed: 0 };
    current.disputed++;
    this.scores.set(key, current);
  }
  
  getScore(agent: `0x${string}`): number {
    const key = agent.toLowerCase();
    const data = this.scores.get(key);
    
    if (!data || data.completed === 0) return 0.5; // Unknown agent
    
    const total = data.completed + data.disputed;
    return data.completed / total;
  }
  
  shouldUseEscrow(agent: `0x${string}`): boolean {
    const score = this.getScore(agent);
    return score < 0.9; // Use escrow if <90% success rate
  }
}
```

---

## Utility Functions

### Format Amounts

```typescript
import { formatEther, formatUnits } from 'viem';

function formatAmount(amount: bigint, token?: string): string {
  if (!token || token === '0x0000000000000000000000000000000000000000') {
    return `${formatEther(amount)} ETH`;
  }
  
  // Add more tokens as needed
  const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
  
  if (token.toLowerCase() === USDC.toLowerCase()) {
    return `${formatUnits(amount, 6)} USDC`;
  }
  
  return `${amount.toString()} tokens`;
}
```

### Get Gas Estimate

```typescript
async function estimateEscrowGas(params: {
  to: `0x${string}`;
  amount: bigint;
}) {
  const gasEstimate = await kara.publicClient.estimateContractGas({
    address: kara.addresses.karaEscrow,
    abi: karaEscrowAbi,
    functionName: 'createTransaction',
    args: [params.to, '0x0...', params.amount, 'test', 0n],
    value: params.amount,
    account: kara.account.address,
  });
  
  const gasPrice = await kara.publicClient.getGasPrice();
  const estimatedCost = gasEstimate * gasPrice;
  
  return {
    gasUnits: gasEstimate,
    gasPrice,
    estimatedCost,
    estimatedCostEth: formatEther(estimatedCost),
  };
}
```

---

## Next Steps

- See **[Integration Guide](./INTEGRATION.md)** for best practices
- Check **[API Reference](./API.md)** for all methods
- View **[Source Code](https://github.com/kara-bolt/dispute)** for implementation details
