/**
 * KaraDispute SDK Constants Tests
 */

import { describe, it, expect } from 'vitest';
import { parseEther } from 'viem';
import {
  CHAINS,
  DEFAULT_RPC_URLS,
  KARA_TIERS,
  BASIS_POINTS,
  DEFAULT_ESCROW_DEADLINE,
  getAddresses,
} from '../constants';

describe('Constants', () => {
  describe('CHAINS', () => {
    it('should have base chain with correct ID', () => {
      expect(CHAINS.base.id).toBe(8453);
      expect(CHAINS.base.name).toBe('Base');
    });

    it('should have base-sepolia chain with correct ID', () => {
      expect(CHAINS['base-sepolia'].id).toBe(84532);
      expect(CHAINS['base-sepolia'].name).toBe('Base Sepolia');
    });
  });

  describe('DEFAULT_RPC_URLS', () => {
    it('should have RPC URLs for all chains', () => {
      expect(DEFAULT_RPC_URLS.base).toBeDefined();
      expect(DEFAULT_RPC_URLS['base-sepolia']).toBeDefined();
    });

    it('should use HTTPS URLs', () => {
      expect(DEFAULT_RPC_URLS.base).toMatch(/^https:\/\//);
      expect(DEFAULT_RPC_URLS['base-sepolia']).toMatch(/^https:\/\//);
    });
  });

  describe('KARA_TIERS', () => {
    it('should have 4 tiers', () => {
      expect(KARA_TIERS.TIER1).toBeDefined();
      expect(KARA_TIERS.TIER2).toBeDefined();
      expect(KARA_TIERS.TIER3).toBeDefined();
      expect(KARA_TIERS.TIER4).toBeDefined();
    });

    it('should have increasing thresholds', () => {
      expect(KARA_TIERS.TIER1.threshold).toBeLessThan(KARA_TIERS.TIER2.threshold);
      expect(KARA_TIERS.TIER2.threshold).toBeLessThan(KARA_TIERS.TIER3.threshold);
      expect(KARA_TIERS.TIER3.threshold).toBeLessThan(KARA_TIERS.TIER4.threshold);
    });

    it('should have increasing discounts', () => {
      expect(KARA_TIERS.TIER1.discount).toBeLessThan(KARA_TIERS.TIER2.discount);
      expect(KARA_TIERS.TIER2.discount).toBeLessThan(KARA_TIERS.TIER3.discount);
      expect(KARA_TIERS.TIER3.discount).toBeLessThan(KARA_TIERS.TIER4.discount);
    });

    it('should have tier 1 threshold at 1000 KARA', () => {
      expect(KARA_TIERS.TIER1.threshold).toBe(parseEther('1000'));
    });

    it('should have tier 4 threshold at 1000000 KARA', () => {
      expect(KARA_TIERS.TIER4.threshold).toBe(parseEther('1000000'));
    });

    it('should have discounts in basis points', () => {
      expect(KARA_TIERS.TIER1.discount).toBe(500); // 5%
      expect(KARA_TIERS.TIER2.discount).toBe(1000); // 10%
      expect(KARA_TIERS.TIER3.discount).toBe(2000); // 20%
      expect(KARA_TIERS.TIER4.discount).toBe(3000); // 30%
    });
  });

  describe('BASIS_POINTS', () => {
    it('should be 10000', () => {
      expect(BASIS_POINTS).toBe(10000);
    });
  });

  describe('DEFAULT_ESCROW_DEADLINE', () => {
    it('should be 7 days in seconds', () => {
      const sevenDaysInSeconds = 7 * 24 * 60 * 60;
      expect(DEFAULT_ESCROW_DEADLINE).toBe(sevenDaysInSeconds);
    });
  });

  describe('getAddresses', () => {
    it('should return addresses for base chain', () => {
      const addresses = getAddresses('base');
      expect(addresses.karaDispute).toBeDefined();
      expect(addresses.karaEscrow).toBeDefined();
      expect(addresses.karaPay).toBeDefined();
      expect(addresses.karaToken).toBeDefined();
    });

    it('should return addresses for base-sepolia chain', () => {
      const addresses = getAddresses('base-sepolia');
      expect(addresses.karaDispute).toBeDefined();
      expect(addresses.karaEscrow).toBeDefined();
      expect(addresses.karaPay).toBeDefined();
      expect(addresses.karaToken).toBeDefined();
    });

    it('should return valid Ethereum addresses', () => {
      const addresses = getAddresses('base');
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;
      
      expect(addresses.karaDispute).toMatch(addressRegex);
      expect(addresses.karaEscrow).toMatch(addressRegex);
      expect(addresses.karaPay).toMatch(addressRegex);
      expect(addresses.karaToken).toMatch(addressRegex);
    });
  });
});
