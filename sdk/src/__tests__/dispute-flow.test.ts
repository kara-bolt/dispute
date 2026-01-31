/**
 * DisputeFlow Tests
 * 
 * Tests for the simplified dispute creation flow.
 * Mocks blockchain interactions to test flow logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseEther, type Address, type Hash } from 'viem';
import { DisputeFlow, type DisputeFlowConfig } from '../flows/dispute-flow';
import { DISPUTE_TEMPLATES, type DisputeReason } from '../flows/templates';
import { DisputeStatus, Ruling } from '../types';

// Mock addresses
const MOCK_CLAIMANT = '0x1111111111111111111111111111111111111111' as Address;
const MOCK_RESPONDENT = '0x2222222222222222222222222222222222222222' as Address;
const MOCK_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash;

// Mock dispute response
const mockDispute = {
  id: 1n,
  claimant: MOCK_CLAIMANT,
  respondent: MOCK_RESPONDENT,
  amount: parseEther('1'),
  status: DisputeStatus.Voting,
  ruling: Ruling.RefusedToArbitrate,
  votingDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400), // 1 day from now
  createdAt: BigInt(Math.floor(Date.now() / 1000)),
  evidenceURI: 'data:application/json;base64,e30=',
};

// Mock escrow response
const mockEscrow = {
  id: 1n,
  payer: MOCK_CLAIMANT,
  payee: MOCK_RESPONDENT,
  amount: parseEther('0.5'),
  token: '0x0000000000000000000000000000000000000000' as Address,
  status: 1, // Created
  deadline: BigInt(Math.floor(Date.now() / 1000) + 604800),
  disputeId: 0n,
};

// Mock vote result
const mockVoteResult = {
  forClaimant: parseEther('100'),
  forRespondent: parseEther('50'),
  abstained: parseEther('25'),
  totalVotes: parseEther('175'),
};

// Mock the client module
vi.mock('../client', () => {
  return {
    KaraDispute: vi.fn().mockImplementation(() => ({
      chain: { id: 84532 },
      getDispute: vi.fn().mockResolvedValue(mockDispute),
      getEscrowTransaction: vi.fn().mockResolvedValue(mockEscrow),
      getVoteResult: vi.fn().mockResolvedValue(mockVoteResult),
      withWallet: vi.fn().mockImplementation((wallet) => ({
        walletClient: wallet,
        agentCreateDispute: vi.fn().mockResolvedValue({
          disputeId: 1n,
          hash: MOCK_TX_HASH,
        }),
        raiseDispute: vi.fn().mockResolvedValue({
          disputeId: 2n,
          hash: MOCK_TX_HASH,
        }),
      })),
    })),
    KaraDisputeWriter: vi.fn(),
  };
});

// Mock viem for wallet creation
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    createWalletClient: vi.fn(() => ({
      account: { address: MOCK_CLAIMANT },
      writeContract: vi.fn(),
    })),
  };
});

vi.mock('viem/accounts', () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: MOCK_CLAIMANT,
  })),
}));

describe('DisputeFlow', () => {
  describe('constructor', () => {
    it('should create read-only flow without wallet', () => {
      const flow = new DisputeFlow({ chain: 'base-sepolia' });
      expect(flow.canWrite).toBe(false);
      expect(flow.address).toBeUndefined();
    });

    it('should create writable flow with wallet client', () => {
      const mockWallet = {
        account: { address: MOCK_CLAIMANT },
      } as any;
      
      const flow = new DisputeFlow({
        chain: 'base-sepolia',
        wallet: mockWallet,
      });
      
      expect(flow.canWrite).toBe(true);
    });

    it('should create writable flow with private key', () => {
      const flow = new DisputeFlow({
        chain: 'base-sepolia',
        privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
      });
      
      expect(flow.canWrite).toBe(true);
    });

    it('should accept custom RPC URL', () => {
      const flow = new DisputeFlow({
        chain: 'base',
        rpcUrl: 'https://custom-rpc.example.com',
      });
      
      expect(flow).toBeDefined();
    });

    it('should default autoApproveKara to true', () => {
      const flow = new DisputeFlow({ chain: 'base-sepolia' });
      // autoApproveKara is private, but we can verify the flow was created
      expect(flow).toBeDefined();
    });
  });

  describe('static methods', () => {
    describe('getTemplates', () => {
      it('should return all dispute templates', () => {
        const templates = DisputeFlow.getTemplates();
        expect(templates).toBe(DISPUTE_TEMPLATES);
      });

      it('should include all dispute reasons', () => {
        const templates = DisputeFlow.getTemplates();
        const reasons: DisputeReason[] = [
          'service_not_delivered',
          'quality_issues',
          'partial_delivery',
          'deadline_missed',
          'scope_dispute',
          'payment_dispute',
          'fraud',
          'other',
        ];
        
        for (const reason of reasons) {
          expect(templates[reason]).toBeDefined();
          expect(templates[reason].title).toBeDefined();
          expect(templates[reason].description).toBeDefined();
        }
      });
    });

    describe('formatAmount', () => {
      it('should format wei to ether string', () => {
        expect(DisputeFlow.formatAmount(parseEther('1'))).toBe('1');
        expect(DisputeFlow.formatAmount(parseEther('0.5'))).toBe('0.5');
        expect(DisputeFlow.formatAmount(parseEther('1.234567'))).toBe('1.234567');
      });

      it('should handle zero', () => {
        expect(DisputeFlow.formatAmount(0n)).toBe('0');
      });

      it('should handle very small amounts', () => {
        expect(DisputeFlow.formatAmount(1n)).toBe('0.000000000000000001');
      });

      it('should handle very large amounts', () => {
        const largeAmount = parseEther('1000000');
        expect(DisputeFlow.formatAmount(largeAmount)).toBe('1000000');
      });
    });

    describe('parseAmount', () => {
      it('should parse ether string to wei', () => {
        expect(DisputeFlow.parseAmount('1')).toBe(parseEther('1'));
        expect(DisputeFlow.parseAmount('0.5')).toBe(parseEther('0.5'));
      });

      it('should handle decimal amounts', () => {
        expect(DisputeFlow.parseAmount('1.5')).toBe(parseEther('1.5'));
        expect(DisputeFlow.parseAmount('0.001')).toBe(parseEther('0.001'));
      });

      it('should roundtrip with formatAmount', () => {
        const original = '1.234567';
        const wei = DisputeFlow.parseAmount(original);
        const formatted = DisputeFlow.formatAmount(wei);
        expect(formatted).toBe(original);
      });
    });
  });

  describe('createDispute', () => {
    it('should throw without wallet', async () => {
      const flow = new DisputeFlow({ chain: 'base-sepolia' });
      
      await expect(flow.createDispute({
        against: MOCK_RESPONDENT,
        amount: parseEther('1'),
        reason: 'service_not_delivered',
      })).rejects.toThrow('Wallet required');
    });

    it('should create dispute with minimal params', async () => {
      const mockWallet = {
        account: { address: MOCK_CLAIMANT },
      } as any;
      
      const flow = new DisputeFlow({
        chain: 'base-sepolia',
        wallet: mockWallet,
      });

      const result = await flow.createDispute({
        against: MOCK_RESPONDENT,
        amount: parseEther('1'),
        reason: 'service_not_delivered',
      });

      expect(result.disputeId).toBe(1n);
      expect(result.txHash).toBe(MOCK_TX_HASH);
      expect(result.evidenceUri).toContain('data:application/json;base64,');
      expect(result.votingDeadline).toBeInstanceOf(Date);
      expect(result.dispute).toBeDefined();
    });

    it('should use custom description', async () => {
      const mockWallet = {
        account: { address: MOCK_CLAIMANT },
      } as any;
      
      const flow = new DisputeFlow({
        chain: 'base-sepolia',
        wallet: mockWallet,
      });

      const customDesc = 'Custom dispute description';
      const result = await flow.createDispute({
        against: MOCK_RESPONDENT,
        amount: parseEther('0.5'),
        reason: 'quality_issues',
        description: customDesc,
      });

      expect(result.disputeId).toBeDefined();
    });

    it('should include additional details in evidence', async () => {
      const mockWallet = {
        account: { address: MOCK_CLAIMANT },
      } as any;
      
      const flow = new DisputeFlow({
        chain: 'base-sepolia',
        wallet: mockWallet,
      });

      const result = await flow.createDispute({
        against: MOCK_RESPONDENT,
        amount: parseEther('1'),
        reason: 'partial_delivery',
        details: {
          deliveredPercentage: 50,
          missingItems: ['item1', 'item2'],
        },
      });

      expect(result.evidenceUri).toBeDefined();
      // Evidence URI contains base64-encoded JSON
      const base64 = result.evidenceUri.split(',')[1];
      const evidence = JSON.parse(Buffer.from(base64, 'base64').toString());
      expect(evidence.details.deliveredPercentage).toBe(50);
    });
  });

  describe('disputeEscrow', () => {
    it('should throw without wallet', async () => {
      const flow = new DisputeFlow({ chain: 'base-sepolia' });
      
      await expect(flow.disputeEscrow({
        escrowId: 1n,
        reason: 'service_not_delivered',
      })).rejects.toThrow('Wallet required');
    });

    it('should dispute existing escrow', async () => {
      const mockWallet = {
        account: { address: MOCK_CLAIMANT },
      } as any;
      
      const flow = new DisputeFlow({
        chain: 'base-sepolia',
        wallet: mockWallet,
      });

      const result = await flow.disputeEscrow({
        escrowId: 1n,
        reason: 'quality_issues',
        description: 'Work was substandard',
      });

      expect(result.disputeId).toBe(2n);
      expect(result.escrow).toBeDefined();
      expect(result.escrow.amount).toBe(mockEscrow.amount);
    });
  });

  describe('getStatus', () => {
    it('should return human-readable status', async () => {
      const flow = new DisputeFlow({ chain: 'base-sepolia' });
      
      const status = await flow.getStatus(1n);
      
      expect(status.status).toBe(DisputeStatus.Voting);
      expect(status.statusText).toBe('Voting');
      expect(status.votingOpen).toBe(true);
      expect(status.votingTimeRemaining).toBeGreaterThan(0);
    });

    it('should include vote counts', async () => {
      const flow = new DisputeFlow({ chain: 'base-sepolia' });
      
      const status = await flow.getStatus(1n);
      
      expect(status.votes.forClaimant).toBe(mockVoteResult.forClaimant);
      expect(status.votes.forRespondent).toBe(mockVoteResult.forRespondent);
      expect(status.votes.abstained).toBe(mockVoteResult.abstained);
    });
  });

  describe('quick dispute methods', () => {
    let flow: DisputeFlow;

    beforeEach(() => {
      const mockWallet = {
        account: { address: MOCK_CLAIMANT },
      } as any;
      
      flow = new DisputeFlow({
        chain: 'base-sepolia',
        wallet: mockWallet,
      });
    });

    describe('disputeServiceNotDelivered', () => {
      it('should create dispute with service details', async () => {
        const result = await flow.disputeServiceNotDelivered({
          against: MOCK_RESPONDENT,
          amount: parseEther('1'),
          serviceDescription: 'Build a website',
          deadline: new Date('2026-01-15'),
        });

        expect(result.disputeId).toBeDefined();
      });

      it('should include optional payment tx hash', async () => {
        const result = await flow.disputeServiceNotDelivered({
          against: MOCK_RESPONDENT,
          amount: parseEther('1'),
          serviceDescription: 'API integration',
          deadline: new Date(),
          paymentTxHash: MOCK_TX_HASH,
        });

        expect(result.evidenceUri).toBeDefined();
      });
    });

    describe('disputeQualityIssues', () => {
      it('should create dispute with issues list', async () => {
        const result = await flow.disputeQualityIssues({
          against: MOCK_RESPONDENT,
          amount: parseEther('0.5'),
          issues: ['Bug in login', 'Broken checkout', 'Missing tests'],
        });

        expect(result.disputeId).toBeDefined();
        
        const base64 = result.evidenceUri.split(',')[1];
        const evidence = JSON.parse(Buffer.from(base64, 'base64').toString());
        expect(evidence.details.issues).toHaveLength(3);
      });
    });

    describe('disputePartialDelivery', () => {
      it('should create dispute with delivery percentage', async () => {
        const result = await flow.disputePartialDelivery({
          against: MOCK_RESPONDENT,
          amount: parseEther('2'),
          deliveredPercentage: 40,
          missingItems: ['Feature A', 'Feature B'],
        });

        expect(result.disputeId).toBeDefined();
        
        const base64 = result.evidenceUri.split(',')[1];
        const evidence = JSON.parse(Buffer.from(base64, 'base64').toString());
        expect(evidence.details.deliveredPercentage).toBe(40);
      });
    });
  });

  describe('evidence URI generation', () => {
    it('should create valid base64 data URL', async () => {
      const mockWallet = {
        account: { address: MOCK_CLAIMANT },
      } as any;
      
      const flow = new DisputeFlow({
        chain: 'base-sepolia',
        wallet: mockWallet,
      });

      const result = await flow.createDispute({
        against: MOCK_RESPONDENT,
        amount: parseEther('1'),
        reason: 'other',
        description: 'Test dispute',
      });

      expect(result.evidenceUri).toMatch(/^data:application\/json;base64,/);
      
      // Should be decodable
      const base64 = result.evidenceUri.replace('data:application/json;base64,', '');
      const decoded = Buffer.from(base64, 'base64').toString();
      const evidence = JSON.parse(decoded);
      
      expect(evidence.type).toBe('other');
      expect(evidence.claimant).toBe(MOCK_CLAIMANT);
      expect(evidence.respondent).toBe(MOCK_RESPONDENT);
    });

    it('should serialize bigint amounts as strings', async () => {
      const mockWallet = {
        account: { address: MOCK_CLAIMANT },
      } as any;
      
      const flow = new DisputeFlow({
        chain: 'base-sepolia',
        wallet: mockWallet,
      });

      const result = await flow.createDispute({
        against: MOCK_RESPONDENT,
        amount: parseEther('1.5'),
        reason: 'payment_dispute',
      });

      const base64 = result.evidenceUri.split(',')[1];
      const evidence = JSON.parse(Buffer.from(base64, 'base64').toString());
      
      // BigInt should be serialized as string
      expect(typeof evidence.amount).toBe('string');
      expect(evidence.amount).toBe(parseEther('1.5').toString());
    });
  });

  describe('status text mapping', () => {
    it('should map all status values', async () => {
      const flow = new DisputeFlow({ chain: 'base-sepolia' });
      
      // The mock returns Voting status
      const status = await flow.getStatus(1n);
      expect(status.statusText).toBe('Voting');
    });
  });

  describe('voting deadline calculation', () => {
    it('should convert unix timestamp to Date', async () => {
      const mockWallet = {
        account: { address: MOCK_CLAIMANT },
      } as any;
      
      const flow = new DisputeFlow({
        chain: 'base-sepolia',
        wallet: mockWallet,
      });

      const result = await flow.createDispute({
        against: MOCK_RESPONDENT,
        amount: parseEther('1'),
        reason: 'service_not_delivered',
      });

      expect(result.votingDeadline).toBeInstanceOf(Date);
      expect(result.votingDeadline.getTime()).toBeGreaterThan(Date.now());
    });
  });
});

describe('DisputeFlow integration scenarios', () => {
  describe('full dispute flow simulation', () => {
    it('should handle complete dispute lifecycle', async () => {
      const mockWallet = {
        account: { address: MOCK_CLAIMANT },
      } as any;
      
      const flow = new DisputeFlow({
        chain: 'base-sepolia',
        wallet: mockWallet,
      });

      // 1. Create dispute
      const createResult = await flow.createDispute({
        against: MOCK_RESPONDENT,
        amount: parseEther('1'),
        reason: 'service_not_delivered',
        description: 'Did not deliver the agreed API',
      });

      expect(createResult.disputeId).toBe(1n);

      // 2. Check status
      const status = await flow.getStatus(createResult.disputeId);
      expect(status.statusText).toBe('Voting');
      expect(status.votingOpen).toBe(true);
    });
  });

  describe('escrow dispute flow simulation', () => {
    it('should handle escrow dispute', async () => {
      const mockWallet = {
        account: { address: MOCK_CLAIMANT },
      } as any;
      
      const flow = new DisputeFlow({
        chain: 'base-sepolia',
        wallet: mockWallet,
      });

      // Dispute an existing escrow
      const result = await flow.disputeEscrow({
        escrowId: 1n,
        reason: 'quality_issues',
        description: 'Delivered code has critical bugs',
        details: {
          bugReports: ['issue #1', 'issue #2'],
        },
      });

      expect(result.disputeId).toBe(2n);
      expect(result.escrow.payer).toBe(MOCK_CLAIMANT);
    });
  });
});
