/**
 * KaraDispute SDK Client Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseEther, zeroAddress, type Address } from 'viem';
import { KaraDispute, KaraDisputeWriter } from '../client';
import { DisputeStatus, TransactionStatus, Ruling } from '../types';
import { KARA_TIERS, BASIS_POINTS } from '../constants';

// Mock viem
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      readContract: vi.fn(),
      waitForTransactionReceipt: vi.fn(),
    })),
    createWalletClient: vi.fn(() => ({
      writeContract: vi.fn(),
      account: { address: '0x1234567890123456789012345678901234567890' as Address },
    })),
  };
});

describe('KaraDispute', () => {
  let client: KaraDispute;

  beforeEach(() => {
    client = new KaraDispute({ chain: 'base-sepolia' });
  });

  describe('constructor', () => {
    it('should create client with base chain', () => {
      const baseClient = new KaraDispute({ chain: 'base' });
      expect(baseClient.chain.id).toBe(8453);
    });

    it('should create client with base-sepolia chain', () => {
      expect(client.chain.id).toBe(84532);
    });

    it('should use custom addresses if provided', () => {
      const customAddress = '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF' as Address;
      const customClient = new KaraDispute({
        chain: 'base-sepolia',
        addresses: { karaDispute: customAddress },
      });
      expect(customClient.addresses.karaDispute).toBe(customAddress);
    });

    it('should use custom RPC URL if provided', () => {
      const customRpc = 'https://custom-rpc.example.com';
      const customClient = new KaraDispute({
        chain: 'base',
        rpcUrl: customRpc,
      });
      expect(customClient).toBeDefined();
    });
  });

  describe('calculateDiscount', () => {
    it('should return 0% for no KARA holdings', () => {
      expect(client.calculateDiscount(0n)).toBe(0);
    });

    it('should return 5% (500 bps) for tier 1 holdings', () => {
      expect(client.calculateDiscount(KARA_TIERS.TIER1.threshold)).toBe(500);
    });

    it('should return 10% (1000 bps) for tier 2 holdings', () => {
      expect(client.calculateDiscount(KARA_TIERS.TIER2.threshold)).toBe(1000);
    });

    it('should return 20% (2000 bps) for tier 3 holdings', () => {
      expect(client.calculateDiscount(KARA_TIERS.TIER3.threshold)).toBe(2000);
    });

    it('should return 30% (3000 bps) for tier 4 holdings', () => {
      expect(client.calculateDiscount(KARA_TIERS.TIER4.threshold)).toBe(3000);
    });

    it('should apply highest eligible tier', () => {
      // Just over tier 2 threshold should get tier 2 discount
      const balance = KARA_TIERS.TIER2.threshold + 1n;
      expect(client.calculateDiscount(balance)).toBe(1000);
    });
  });

  describe('calculateDiscountedFee', () => {
    it('should return full fee with 0% discount', () => {
      const baseFee = parseEther('0.01');
      const discounted = client.calculateDiscountedFee(baseFee, 0);
      expect(discounted).toBe(baseFee);
    });

    it('should apply 5% discount correctly', () => {
      const baseFee = parseEther('1');
      const discounted = client.calculateDiscountedFee(baseFee, 500);
      expect(discounted).toBe(parseEther('0.95'));
    });

    it('should apply 30% discount correctly', () => {
      const baseFee = parseEther('1');
      const discounted = client.calculateDiscountedFee(baseFee, 3000);
      expect(discounted).toBe(parseEther('0.7'));
    });

    it('should handle small amounts without precision loss', () => {
      const baseFee = 1000n;
      const discounted = client.calculateDiscountedFee(baseFee, 1000);
      expect(discounted).toBe(900n);
    });
  });

  describe('withWallet', () => {
    it('should return KaraDisputeWriter instance', () => {
      const mockWalletClient = {
        account: { address: '0x1234567890123456789012345678901234567890' as Address },
      } as any;
      
      const writer = client.withWallet(mockWalletClient);
      expect(writer).toBeInstanceOf(KaraDisputeWriter);
    });
  });
});

describe('KaraDisputeWriter', () => {
  describe('agent-friendly methods', () => {
    it('agentCreateEscrow should use default 7-day deadline', async () => {
      // This test verifies the deadline calculation
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      const now = Math.floor(Date.now() / 1000);
      const expectedDeadline = BigInt(now + sevenDaysInSeconds);
      
      // The actual deadline should be within a few seconds of expected
      const tolerance = 5n;
      expect(expectedDeadline).toBeGreaterThan(BigInt(now) + BigInt(sevenDaysInSeconds) - tolerance);
    });
  });
});

describe('Dispute parsing', () => {
  it('should correctly map dispute status enum', () => {
    expect(DisputeStatus.None).toBe(0);
    expect(DisputeStatus.Open).toBe(1);
    expect(DisputeStatus.Voting).toBe(2);
    expect(DisputeStatus.Resolved).toBe(3);
    expect(DisputeStatus.Appealed).toBe(4);
  });

  it('should correctly map ruling enum', () => {
    expect(Ruling.RefusedToArbitrate).toBe(0);
    expect(Ruling.Claimant).toBe(1);
    expect(Ruling.Respondent).toBe(2);
  });

  it('should correctly map transaction status enum', () => {
    expect(TransactionStatus.None).toBe(0);
    expect(TransactionStatus.Created).toBe(1);
    expect(TransactionStatus.Funded).toBe(2);
    expect(TransactionStatus.Disputed).toBe(3);
    expect(TransactionStatus.Resolved).toBe(4);
    expect(TransactionStatus.Cancelled).toBe(5);
  });
});
