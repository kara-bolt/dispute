# Code Examples

Ready-to-use code samples for common KaraDispute scenarios.

## Table of Contents

- [Setup](#setup)
- [Escrow Operations](#escrow-operations)
- [Dispute Operations](#dispute-operations)
- [KARA Token Operations](#kara-token-operations)
- [Agent Workflows](#agent-workflows)

---

## Setup

### Basic Client Setup

```typescript
import { KaraDispute } from '@kara/dispute-sdk';
import { createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

// Read-only client
const kara = new KaraDispute({ chain: 'base' });

// Write-enabled client
const wallet = createWalletClient({
  account: privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`),
  chain: base,
  transport: http(),
});

const karaWriter = kara.withWallet(wallet);
```

### With Custom RPC

```typescript
const kara = new KaraDispute({ 
  chain: 'base',
  rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/YOUR_KEY',
});
```

### Testnet Setup

```typescript
const kara = new KaraDispute({ chain: 'base-sepolia' });
```

---

## Escrow Operations

### Create Simple ETH Escrow

```typescript
import { parseEther } from 'viem';

async function createEthEscrow() {
  const { transactionId, hash } = await karaWriter.agentCreateEscrow({
    from: karaWriter.account.address,
    to: '0xRecipient...',
    amount: parseEther('0.1'),
    description: 'Payment for code review',
    deadlineSeconds: 86400, // 24 hours
  });

  console.log(`Created escrow ${transactionId}`);
  console.log(`Transaction: https://basescan.org/tx/${hash}`);
  
  return transactionId;
}
```

### Create ERC20 Token Escrow

```typescript
import { parseUnits } from 'viem';

async function createUsdcEscrow() {
  const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base
  
  const { transactionId, hash } = await karaWriter.createEscrow({
    payee: '0xRecipient...',
    token: USDC,
    amount: parseUnits('100', 6), // USDC has 6 decimals
    description: 'USDC payment for services',
    deadline: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60),
  });

  console.log(`USDC escrow ${transactionId} created`);
  return transactionId;
}
```

### Release Escrow (Happy Path)

```typescript
async function releasePayment(escrowId: bigint) {
  // Verify escrow status first
  const escrow = await kara.getEscrowTransaction(escrowId);
  
  if (escrow.status !== 2) { // TransactionStatus.Funded
    throw new Error(`Cannot release: status is ${escrow.status}`);
  }
  
  const hash = await karaWriter.releaseEscrow(escrowId);
  console.log(`Released! tx: ${hash}`);
}
```

### Cancel Unfunded Escrow

```typescript
async function cancelEscrow(escrowId: bigint) {
  const escrow = await kara.getEscrowTransaction(escrowId);
  
  if (escrow.status !== 1) { // TransactionStatus.Created
    throw new Error('Can only cancel unfunded escrows');
  }
  
  const hash = await karaWriter.cancelEscrow(escrowId);
  console.log(`Cancelled! tx: ${hash}`);
}
```

### Check Escrow Status

```typescript
import { TransactionStatus } from '@kara/dispute-sdk';

async function getEscrowInfo(escrowId: bigint) {
  const escrow = await kara.getEscrowTransaction(escrowId);
  
  const statusNames = ['None', 'Created', 'Funded', 'Disputed', 'Resolved', 'Cancelled'];
  
  return {
    id: escrow.id.toString(),
    payer: escrow.payer,
    payee: escrow.payee,
    amount: formatEther(escrow.amount),
    status: statusNames[escrow.status],
    description: escrow.description,
    deadline: new Date(Number(escrow.deadline) * 1000).toISOString(),
    disputeId: escrow.disputeId > 0n ? escrow.disputeId.toString() : null,
  };
}

// Usage
const info = await getEscrowInfo(1n);
console.log(info);
// {
//   id: '1',
//   payer: '0x...',
//   payee: '0x...',
//   amount: '0.1',
//   status: 'Funded',
//   description: 'Payment for code review',
//   deadline: '2024-02-06T12:00:00.000Z',
//   disputeId: null
// }
```

---

## Dispute Operations

### Raise Dispute on Escrow

```typescript
async function disputeEscrow(escrowId: bigint, reason: string) {
  // Prepare evidence
  const evidence = {
    escrowId: escrowId.toString(),
    reason,
    timestamp: Date.now(),
    disputedBy: karaWriter.account.address,
  };
  
  // In production, upload to IPFS
  const evidenceURI = `data:application/json,${JSON.stringify(evidence)}`;
  
  const { disputeId, hash } = await karaWriter.raiseDispute({
    transactionId: escrowId,
    evidenceURI,
  });

  console.log(`Dispute ${disputeId} created: ${hash}`);
  return disputeId;
}
```

### Create Direct Dispute (No Escrow)

```typescript
async function createDirectDispute(
  counterparty: `0x${string}`,
  amount: bigint,
  description: string
) {
  const { disputeId, hash } = await karaWriter.agentCreateDispute({
    from: karaWriter.account.address,
    counterparty,
    amount,
    description,
    evidence: {
      type: 'direct_dispute',
      description,
      timestamp: Date.now(),
      claimant: karaWriter.account.address,
      respondent: counterparty,
    },
  });

  console.log(`Direct dispute ${disputeId} created`);
  return disputeId;
}
```

### Monitor Dispute Progress

```typescript
import { DisputeStatus, Ruling } from '@kara/dispute-sdk';

async function watchDispute(disputeId: bigint) {
  const dispute = await kara.getDispute(disputeId);
  
  const statusMap = {
    [DisputeStatus.None]: 'Not Created',
    [DisputeStatus.Open]: 'Open - Awaiting Votes',
    [DisputeStatus.Voting]: 'Voting in Progress',
    [DisputeStatus.Resolved]: 'Resolved',
    [DisputeStatus.Appealed]: 'Appealed',
  };
  
  const rulingMap = {
    [Ruling.RefusedToArbitrate]: 'No Ruling',
    [Ruling.Claimant]: 'Claimant Wins',
    [Ruling.Respondent]: 'Respondent Wins',
  };

  console.log(`Dispute ${disputeId}:`);
  console.log(`  Status: ${statusMap[dispute.status]}`);
  console.log(`  Ruling: ${rulingMap[dispute.ruling]}`);
  console.log(`  Amount: ${formatEther(dispute.amount)} ETH`);
  console.log(`  Appeal Round: ${dispute.appealRound}`);
  console.log(`  Voting Deadline: ${new Date(Number(dispute.votingDeadline) * 1000).toISOString()}`);
  
  if (dispute.status === DisputeStatus.Voting) {
    const votes = await kara.getVoteResult(disputeId);
    console.log(`  Votes For Claimant: ${votes.forClaimant}`);
    console.log(`  Votes For Respondent: ${votes.forRespondent}`);
    console.log(`  Abstained: ${votes.abstained}`);
  }
  
  return dispute;
}
```

### Appeal a Ruling

```typescript
async function appealDispute(disputeId: bigint) {
  const dispute = await kara.getDispute(disputeId);
  
  if (dispute.status !== DisputeStatus.Resolved) {
    throw new Error('Can only appeal resolved disputes');
  }
  
  // Appeals cost 2x the base fee
  const appealCost = await kara.getArbitrationCostKara(karaWriter.account.address);
  console.log(`Appeal cost: ${formatEther(appealCost * 2n)} KARA`);
  
  const hash = await karaWriter.appealWithKara(disputeId);
  console.log(`Appealed! tx: ${hash}`);
}
```

### Execute Final Ruling

```typescript
async function resolveDispute(disputeId: bigint) {
  const dispute = await kara.getDispute(disputeId);
  
  // Check voting is complete
  if (dispute.status !== DisputeStatus.Voting) {
    throw new Error('Dispute not in voting phase');
  }
  
  if (BigInt(Date.now() / 1000) < dispute.votingDeadline) {
    throw new Error('Voting deadline not reached');
  }
  
  const hash = await karaWriter.resolveDispute(disputeId);
  console.log(`Resolved! tx: ${hash}`);
}
```

---

## KARA Token Operations

### Check Balance and Discount

```typescript
async function checkKaraStatus(address: `0x${string}`) {
  const balance = await kara.getKaraBalance(address);
  const discount = await kara.getHolderDiscount(address);
  
  const tiers = [
    { min: 1_000_000n, discount: 30 },
    { min: 100_000n, discount: 20 },
    { min: 10_000n, discount: 10 },
    { min: 1_000n, discount: 5 },
    { min: 0n, discount: 0 },
  ];
  
  const balanceKara = Number(balance / 10n ** 18n);
  const tier = tiers.find(t => BigInt(balanceKara) >= t.min);
  
  console.log(`KARA Balance: ${balanceKara.toLocaleString()} KARA`);
  console.log(`Discount: ${discount / 100}%`);
  console.log(`Tier: ${tier?.discount === 0 ? 'None' : `${tier?.discount}% off`}`);
  
  // Show cost comparison
  const baseCost = await kara.getArbitrationCostEth();
  const karaCost = await kara.getArbitrationCostKara(address);
  
  console.log(`\nArbitration Costs:`);
  console.log(`  ETH (no discount): ${formatEther(baseCost)} ETH`);
  console.log(`  KARA (with discount): ${formatEther(karaCost)} KARA`);
}
```

### Stake to Become Arbitrator

```typescript
import { MIN_ARBITRATOR_STAKE } from '@kara/dispute-sdk';

async function stakeAsArbitrator() {
  const balance = await kara.getKaraBalance(karaWriter.account.address);
  
  if (balance < MIN_ARBITRATOR_STAKE) {
    const needed = MIN_ARBITRATOR_STAKE - balance;
    throw new Error(`Need ${formatEther(needed)} more KARA to stake`);
  }
  
  console.log(`Staking ${formatEther(MIN_ARBITRATOR_STAKE)} KARA...`);
  const hash = await karaWriter.stakeKara(MIN_ARBITRATOR_STAKE);
  console.log(`Staked! tx: ${hash}`);
  
  // Verify
  const stake = await kara.getArbitratorStake(karaWriter.account.address);
  console.log(`Active: ${stake.active}`);
  console.log(`Amount: ${formatEther(stake.amount)} KARA`);
}
```

### Check Arbitrator Status

```typescript
async function getArbitratorInfo(address: `0x${string}`) {
  const stake = await kara.getArbitratorStake(address);
  const isActive = await kara.isArbitratorActive(address);
  
  return {
    address,
    active: isActive,
    stakedAmount: formatEther(stake.amount),
    stakedAt: stake.stakedAt > 0n 
      ? new Date(Number(stake.stakedAt) * 1000).toISOString() 
      : null,
    lockedUntil: stake.lockedUntil > 0n
      ? new Date(Number(stake.lockedUntil) * 1000).toISOString()
      : null,
    slashedAmount: formatEther(stake.slashedAmount),
  };
}
```

### Unstake KARA

```typescript
async function unstakeKara(amount: bigint) {
  const stake = await kara.getArbitratorStake(karaWriter.account.address);
  
  // Check lock period
  if (BigInt(Date.now() / 1000) < stake.lockedUntil) {
    const unlockDate = new Date(Number(stake.lockedUntil) * 1000);
    throw new Error(`Stake locked until ${unlockDate.toISOString()}`);
  }
  
  if (amount > stake.amount) {
    throw new Error(`Can only unstake up to ${formatEther(stake.amount)} KARA`);
  }
  
  const hash = await karaWriter.unstakeKara(amount);
  console.log(`Unstaked ${formatEther(amount)} KARA: ${hash}`);
}
```

---

## Agent Workflows

### Complete Service Transaction Flow

```typescript
/**
 * Full flow: Agent A pays Agent B for a service
 */
async function completeServiceTransaction(
  serviceProvider: `0x${string}`,
  task: string,
  paymentEth: string
) {
  const amount = parseEther(paymentEth);
  
  // 1. Create escrow
  console.log('Creating escrow...');
  const { transactionId } = await karaWriter.agentCreateEscrow({
    from: karaWriter.account.address,
    to: serviceProvider,
    amount,
    description: task,
    deadlineSeconds: 86400,
  });
  console.log(`✅ Escrow ${transactionId} created`);
  
  // 2. Simulate service completion (your agent logic)
  console.log('Waiting for service delivery...');
  const serviceDelivered = await simulateServiceDelivery(task);
  
  // 3. Verify and release or dispute
  if (serviceDelivered.success) {
    console.log('Service delivered successfully, releasing payment...');
    await karaWriter.releaseEscrow(transactionId);
    console.log('✅ Payment released');
    return { success: true, escrowId: transactionId };
  } else {
    console.log('Service failed, raising dispute...');
    const { disputeId } = await karaWriter.raiseDispute({
      transactionId,
      evidenceURI: JSON.stringify({
        reason: serviceDelivered.error,
        task,
        timestamp: Date.now(),
      }),
    });
    console.log(`⚠️ Dispute ${disputeId} created`);
    return { success: false, escrowId: transactionId, disputeId };
  }
}

// Helper (replace with your actual service logic)
async function simulateServiceDelivery(task: string) {
  await new Promise(r => setTimeout(r, 1000));
  return { success: true, result: 'Task completed' };
}
```

### Batch Escrow Creation

```typescript
async function createMultipleEscrows(
  payments: Array<{
    to: `0x${string}`;
    amount: bigint;
    description: string;
  }>
) {
  const results = [];
  
  for (const payment of payments) {
    try {
      const { transactionId, hash } = await karaWriter.agentCreateEscrow({
        from: karaWriter.account.address,
        to: payment.to,
        amount: payment.amount,
        description: payment.description,
        deadlineSeconds: 86400,
      });
      
      results.push({
        ...payment,
        escrowId: transactionId,
        hash,
        status: 'created',
      });
      
      console.log(`Created escrow ${transactionId} to ${payment.to}`);
    } catch (error: any) {
      results.push({
        ...payment,
        error: error.message,
        status: 'failed',
      });
    }
  }
  
  return results;
}

// Usage
const results = await createMultipleEscrows([
  { to: '0xAgent1...', amount: parseEther('0.1'), description: 'Task 1' },
  { to: '0xAgent2...', amount: parseEther('0.2'), description: 'Task 2' },
  { to: '0xAgent3...', amount: parseEther('0.15'), description: 'Task 3' },
]);
```

### Poll Dispute Resolution

```typescript
async function waitForDisputeResolution(
  disputeId: bigint,
  pollIntervalMs: number = 60000
): Promise<Ruling> {
  console.log(`Monitoring dispute ${disputeId}...`);
  
  while (true) {
    const dispute = await kara.getDispute(disputeId);
    
    if (dispute.status === DisputeStatus.Resolved) {
      const rulingNames = ['Refused', 'Claimant Wins', 'Respondent Wins'];
      console.log(`Dispute resolved: ${rulingNames[dispute.ruling]}`);
      return dispute.ruling;
    }
    
    if (dispute.status === DisputeStatus.Voting) {
      const votes = await kara.getVoteResult(disputeId);
      console.log(`Voting: ${votes.forClaimant} vs ${votes.forRespondent}`);
    }
    
    console.log(`Status: ${DisputeStatus[dispute.status]}, checking again in ${pollIntervalMs / 1000}s...`);
    await new Promise(r => setTimeout(r, pollIntervalMs));
  }
}
```

### Protocol Statistics

```typescript
async function getProtocolStats() {
  const [disputeCount, totalStaked, feesCollected] = await Promise.all([
    kara.getDisputeCount(),
    kara.getTotalStaked(),
    kara.getTotalFeesCollected(),
  ]);
  
  return {
    totalDisputes: disputeCount.toString(),
    totalKaraStaked: `${formatEther(totalStaked)} KARA`,
    totalFeesCollected: `${formatEther(feesCollected)} KARA`,
  };
}

// Usage
const stats = await getProtocolStats();
console.log('KaraDispute Protocol Stats:', stats);
```

---

## Error Handling Patterns

### Retry with Backoff

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRetryable = 
        error.message?.includes('timeout') ||
        error.message?.includes('rate limit') ||
        error.name === 'TransactionExecutionError';
      
      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }
      
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}

// Usage
const result = await withRetry(() => 
  karaWriter.agentCreateEscrow({
    from: karaWriter.account.address,
    to: '0x...',
    amount: parseEther('0.1'),
    description: 'Test',
  })
);
```

### Safe Transaction Wrapper

```typescript
interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  hash?: string;
}

async function safeTransaction<T>(
  fn: () => Promise<T>
): Promise<TransactionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error: any) {
    console.error('Transaction failed:', error.shortMessage || error.message);
    return {
      success: false,
      error: error.shortMessage || error.message,
    };
  }
}

// Usage
const result = await safeTransaction(() =>
  karaWriter.releaseEscrow(1n)
);

if (result.success) {
  console.log('Released!');
} else {
  console.log('Failed:', result.error);
}
```

---

## TypeScript Utilities

### Type-Safe Address Validation

```typescript
function isValidAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function requireAddress(address: string): `0x${string}` {
  if (!isValidAddress(address)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return address;
}

// Usage
const recipient = requireAddress(process.env.RECIPIENT!);
```

### Environment Config Helper

```typescript
interface AgentConfig {
  privateKey: `0x${string}`;
  chain: 'base' | 'base-sepolia';
  rpcUrl?: string;
}

function loadConfig(): AgentConfig {
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  
  if (!privateKey?.startsWith('0x') || privateKey.length !== 66) {
    throw new Error('Invalid AGENT_PRIVATE_KEY');
  }
  
  return {
    privateKey: privateKey as `0x${string}`,
    chain: process.env.CHAIN === 'testnet' ? 'base-sepolia' : 'base',
    rpcUrl: process.env.RPC_URL,
  };
}
```

---

Need more examples? [Open an issue](https://github.com/kara-bolt/dispute/issues) with your use case!
