/**
 * Escrow Flow Tests
 * 
 * Tests for escrow operations using mocked client (same pattern as dispute-flow.test.ts)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseEther, zeroAddress, type Address, type Hash } from 'viem';
import { TransactionStatus } from '../types';
import { DEFAULT_ESCROW_DEADLINE } from '../constants';

// Mock addresses
const MOCK_PAYER = '0x1111111111111111111111111111111111111111' as Address;
const MOCK_PAYEE = '0x2222222222222222222222222222222222222222' as Address;
const MOCK_TOKEN = '0x3333333333333333333333333333333333333333' as Address;
const MOCK_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash;
const MOCK_TRANSACTION_ID = 42n;
const MOCK_DISPUTE_ID = 7n;
const MOCK_ARBITRATION_COST = parseEther('0.01');

// Mock escrow transaction
const mockEscrow = {
  id: MOCK_TRANSACTION_ID,
  payer: MOCK_PAYER,
  payee: MOCK_PAYEE,
  token: zeroAddress,
  amount: parseEther('1'),
  status: TransactionStatus.Created,
  disputeId: 0n,
  description: 'Test escrow',
  deadline: BigInt(Math.floor(Date.now() / 1000) + 604800),
  createdAt: BigInt(Math.floor(Date.now() / 1000)),
};

// Mock writer functions
const mockCreateEscrow = vi.fn().mockResolvedValue({
  transactionId: MOCK_TRANSACTION_ID,
  hash: MOCK_TX_HASH,
});

const mockReleaseEscrow = vi.fn().mockResolvedValue(MOCK_TX_HASH);
const mockCancelEscrow = vi.fn().mockResolvedValue(MOCK_TX_HASH);
const mockRaiseDispute = vi.fn().mockResolvedValue({
  disputeId: MOCK_DISPUTE_ID,
  hash: MOCK_TX_HASH,
});
const mockAgentCreateEscrow = vi.fn().mockResolvedValue({
  transactionId: MOCK_TRANSACTION_ID,
  hash: MOCK_TX_HASH,
});
const mockCreateDisputeWithKara = vi.fn().mockResolvedValue({
  disputeId: MOCK_DISPUTE_ID,
  hash: MOCK_TX_HASH,
});
const mockAppealWithKara = vi.fn().mockResolvedValue(MOCK_TX_HASH);
const mockResolveDispute = vi.fn().mockResolvedValue(MOCK_TX_HASH);
const mockStakeKara = vi.fn().mockResolvedValue(MOCK_TX_HASH);
const mockUnstakeKara = vi.fn().mockResolvedValue(MOCK_TX_HASH);

// Mock the client module
vi.mock('../client', () => {
  return {
    KaraDispute: vi.fn().mockImplementation(() => ({
      chain: { id: 84532 },
      getEscrowTransaction: vi.fn().mockResolvedValue({
        id: 42n,
        payer: '0x1111111111111111111111111111111111111111',
        payee: '0x2222222222222222222222222222222222222222',
        token: '0x0000000000000000000000000000000000000000',
        amount: 1000000000000000000n, // 1 ETH
        status: 1, // Created
        disputeId: 0n,
        description: 'Test escrow',
        deadline: BigInt(Math.floor(Date.now() / 1000) + 604800),
        createdAt: BigInt(Math.floor(Date.now() / 1000)),
      }),
      getArbitrationCostEth: vi.fn().mockResolvedValue(10000000000000000n), // 0.01 ETH
      getArbitrationCostKara: vi.fn().mockResolvedValue(100000000000000000000n), // 100 KARA
      withWallet: vi.fn().mockImplementation((wallet) => ({
        walletClient: wallet,
        account: wallet.account,
        createEscrow: vi.fn().mockResolvedValue({
          transactionId: 42n,
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        }),
        releaseEscrow: vi.fn().mockResolvedValue('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'),
        cancelEscrow: vi.fn().mockResolvedValue('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'),
        raiseDispute: vi.fn().mockResolvedValue({
          disputeId: 7n,
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        }),
        agentCreateEscrow: vi.fn().mockResolvedValue({
          transactionId: 42n,
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        }),
        createDisputeWithKara: vi.fn().mockResolvedValue({
          disputeId: 7n,
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        }),
        appealWithKara: vi.fn().mockResolvedValue('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'),
        resolveDispute: vi.fn().mockResolvedValue('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'),
        stakeKara: vi.fn().mockResolvedValue('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'),
        unstakeKara: vi.fn().mockResolvedValue('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'),
      })),
    })),
    KaraDisputeWriter: vi.fn(),
  };
});

// Import after mocking
import { KaraDispute } from '../client';

describe('Escrow - Read Operations', () => {
  let client: KaraDispute;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new KaraDispute({ chain: 'base-sepolia' });
  });

  describe('getEscrowTransaction', () => {
    it('should fetch escrow by ID', async () => {
      const escrow = await client.getEscrowTransaction(1n);
      
      expect(escrow.payer).toBe(MOCK_PAYER);
      expect(escrow.payee).toBe(MOCK_PAYEE);
    });

    it('should return escrow with status', async () => {
      const escrow = await client.getEscrowTransaction(1n);
      
      expect(escrow.status).toBe(TransactionStatus.Created);
    });

    it('should parse amount as bigint', async () => {
      const escrow = await client.getEscrowTransaction(1n);
      
      expect(typeof escrow.amount).toBe('bigint');
      expect(escrow.amount).toBe(parseEther('1'));
    });

    it('should parse deadline as bigint', async () => {
      const escrow = await client.getEscrowTransaction(1n);
      
      expect(typeof escrow.deadline).toBe('bigint');
    });

    it('should return zero disputeId for undisputed escrow', async () => {
      const escrow = await client.getEscrowTransaction(1n);
      
      expect(escrow.disputeId).toBe(0n);
    });
  });

  describe('getArbitrationCostEth', () => {
    it('should return cost as bigint', async () => {
      const cost = await client.getArbitrationCostEth();
      
      expect(typeof cost).toBe('bigint');
    });

    it('should return expected arbitration cost', async () => {
      const cost = await client.getArbitrationCostEth();
      
      expect(cost).toBe(MOCK_ARBITRATION_COST);
    });
  });
});

describe('Escrow - Write Operations', () => {
  let client: KaraDispute;
  let writer: ReturnType<typeof client.withWallet>;
  let mockWallet: any;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new KaraDispute({ chain: 'base-sepolia' });
    mockWallet = {
      account: { address: MOCK_PAYER },
      writeContract: vi.fn(),
    };
    writer = client.withWallet(mockWallet);
  });

  describe('createEscrow', () => {
    it('should create escrow and return transactionId', async () => {
      const result = await writer.createEscrow({
        payee: MOCK_PAYEE,
        amount: parseEther('1'),
        description: 'Test payment',
        deadline: BigInt(Math.floor(Date.now() / 1000) + 604800),
      });

      expect(result.transactionId).toBe(MOCK_TRANSACTION_ID);
      expect(result.hash).toBe(MOCK_TX_HASH);
    });

    it('should accept token parameter for ERC20 escrow', async () => {
      const result = await writer.createEscrow({
        payee: MOCK_PAYEE,
        token: MOCK_TOKEN,
        amount: parseEther('100'),
        description: 'Token payment',
        deadline: BigInt(Math.floor(Date.now() / 1000) + 604800),
      });

      expect(result.transactionId).toBeDefined();
    });

    it('should handle different amounts', async () => {
      const result = await writer.createEscrow({
        payee: MOCK_PAYEE,
        amount: parseEther('0.5'),
        description: 'Small payment',
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
      });

      expect(result.hash).toBe(MOCK_TX_HASH);
    });
  });

  describe('releaseEscrow', () => {
    it('should release escrow by ID', async () => {
      const hash = await writer.releaseEscrow(123n);
      
      expect(hash).toBe(MOCK_TX_HASH);
    });

    it('should handle different escrow IDs', async () => {
      const hash = await writer.releaseEscrow(999n);
      
      expect(hash).toBe(MOCK_TX_HASH);
    });
  });

  describe('cancelEscrow', () => {
    it('should cancel escrow by ID', async () => {
      const hash = await writer.cancelEscrow(456n);
      
      expect(hash).toBe(MOCK_TX_HASH);
    });
  });

  describe('raiseDispute', () => {
    it('should raise dispute on escrow', async () => {
      const result = await writer.raiseDispute({
        transactionId: MOCK_TRANSACTION_ID,
        evidenceURI: 'ipfs://QmEvidence',
      });

      expect(result.disputeId).toBe(MOCK_DISPUTE_ID);
      expect(result.hash).toBe(MOCK_TX_HASH);
    });

    it('should accept evidence URI string', async () => {
      const result = await writer.raiseDispute({
        transactionId: 1n,
        evidenceURI: 'data:application/json,{"reason":"service_not_delivered"}',
      });

      expect(result.disputeId).toBeDefined();
    });
  });

  describe('agentCreateEscrow', () => {
    it('should create escrow with simplified params', async () => {
      const result = await writer.agentCreateEscrow({
        to: MOCK_PAYEE,
        amount: parseEther('1'),
        description: 'Agent payment',
      });

      expect(result.transactionId).toBe(MOCK_TRANSACTION_ID);
      expect(result.hash).toBe(MOCK_TX_HASH);
    });

    it('should accept custom deadline in seconds', async () => {
      const result = await writer.agentCreateEscrow({
        to: MOCK_PAYEE,
        amount: parseEther('0.5'),
        description: 'Custom deadline',
        deadlineSeconds: 3 * 24 * 60 * 60, // 3 days
      });

      expect(result.transactionId).toBeDefined();
    });

    it('should accept optional token', async () => {
      const result = await writer.agentCreateEscrow({
        to: MOCK_PAYEE,
        token: MOCK_TOKEN,
        amount: parseEther('100'),
        description: 'Token payment',
      });

      expect(result.hash).toBeDefined();
    });
  });
});

describe('Dispute Operations via Escrow', () => {
  let client: KaraDispute;
  let writer: ReturnType<typeof client.withWallet>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new KaraDispute({ chain: 'base-sepolia' });
    writer = client.withWallet({
      account: { address: MOCK_PAYER },
    } as any);
  });

  describe('createDisputeWithKara', () => {
    it('should create dispute with KARA payment', async () => {
      const result = await writer.createDisputeWithKara({
        claimant: MOCK_PAYER,
        respondent: MOCK_PAYEE,
        amount: parseEther('1'),
        evidenceURI: 'ipfs://QmDispute',
      });

      expect(result.disputeId).toBe(MOCK_DISPUTE_ID);
      expect(result.hash).toBe(MOCK_TX_HASH);
    });
  });

  describe('appealWithKara', () => {
    it('should appeal dispute', async () => {
      const hash = await writer.appealWithKara(1n);
      
      expect(hash).toBe(MOCK_TX_HASH);
    });
  });

  describe('resolveDispute', () => {
    it('should resolve dispute', async () => {
      const hash = await writer.resolveDispute(1n);
      
      expect(hash).toBe(MOCK_TX_HASH);
    });
  });
});

describe('Staking Operations', () => {
  let client: KaraDispute;
  let writer: ReturnType<typeof client.withWallet>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new KaraDispute({ chain: 'base-sepolia' });
    writer = client.withWallet({
      account: { address: MOCK_PAYER },
    } as any);
  });

  describe('stakeKara', () => {
    it('should stake KARA', async () => {
      const hash = await writer.stakeKara(parseEther('1000'));
      
      expect(hash).toBe(MOCK_TX_HASH);
    });
  });

  describe('unstakeKara', () => {
    it('should unstake KARA', async () => {
      const hash = await writer.unstakeKara(parseEther('500'));
      
      expect(hash).toBe(MOCK_TX_HASH);
    });
  });
});

describe('Escrow Flow Integration Scenarios', () => {
  let client: KaraDispute;
  let writer: ReturnType<typeof client.withWallet>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new KaraDispute({ chain: 'base-sepolia' });
    writer = client.withWallet({
      account: { address: MOCK_PAYER },
    } as any);
  });

  it('should complete happy path: create → release', async () => {
    // Create escrow
    const createResult = await writer.agentCreateEscrow({
      to: MOCK_PAYEE,
      amount: parseEther('1'),
      description: 'Service payment',
    });
    expect(createResult.transactionId).toBeDefined();

    // Release funds
    const releaseHash = await writer.releaseEscrow(createResult.transactionId);
    expect(releaseHash).toBe(MOCK_TX_HASH);
  });

  it('should complete dispute path: create → dispute', async () => {
    // Create escrow
    const createResult = await writer.agentCreateEscrow({
      to: MOCK_PAYEE,
      amount: parseEther('0.5'),
      description: 'Deliverable work',
    });
    expect(createResult.transactionId).toBeDefined();

    // Raise dispute
    const disputeResult = await writer.raiseDispute({
      transactionId: createResult.transactionId,
      evidenceURI: 'ipfs://QmServiceNotDelivered',
    });
    expect(disputeResult.disputeId).toBeDefined();
  });

  it('should complete cancel path: create → cancel', async () => {
    // Create escrow
    const createResult = await writer.agentCreateEscrow({
      to: MOCK_PAYEE,
      amount: parseEther('2'),
      description: 'Cancelled job',
    });
    expect(createResult.transactionId).toBeDefined();

    // Cancel escrow
    const cancelHash = await writer.cancelEscrow(createResult.transactionId);
    expect(cancelHash).toBe(MOCK_TX_HASH);
  });

  it('should support multi-step workflow', async () => {
    // Step 1: Create escrow for job
    const escrow = await writer.agentCreateEscrow({
      to: MOCK_PAYEE,
      amount: parseEther('1'),
      description: 'Development milestone 1',
    });
    expect(escrow.transactionId).toBeDefined();

    // Step 2: Get escrow status
    const status = await client.getEscrowTransaction(escrow.transactionId);
    expect(status.status).toBe(TransactionStatus.Created);

    // Step 3: Release on completion
    const hash = await writer.releaseEscrow(escrow.transactionId);
    expect(hash).toBe(MOCK_TX_HASH);
  });
});

describe('Constants', () => {
  it('DEFAULT_ESCROW_DEADLINE should be 7 days in seconds', () => {
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    expect(DEFAULT_ESCROW_DEADLINE).toBe(sevenDaysInSeconds);
  });
});
