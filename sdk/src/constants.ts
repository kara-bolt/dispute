/**
 * KaraDispute SDK Constants
 * @module @kara/dispute-sdk
 */

import type { Address } from 'viem';
import { base, baseSepolia } from 'viem/chains';

// ============ $KARA Token ============

export const KARA_TOKEN_ADDRESS: Address = '0x99926046978e9fB6544140982fB32cddC7e86b07';

// ============ Holder Tiers ============

export const KARA_TIERS = {
  TIER1: {
    threshold: 1000n * 10n ** 18n,  // 1,000 KARA
    discount: 500,                   // 5%
  },
  TIER2: {
    threshold: 10000n * 10n ** 18n, // 10,000 KARA
    discount: 1000,                  // 10%
  },
  TIER3: {
    threshold: 100000n * 10n ** 18n, // 100,000 KARA
    discount: 2000,                   // 20%
  },
  TIER4: {
    threshold: 1000000n * 10n ** 18n, // 1,000,000 KARA
    discount: 3000,                    // 30%
  },
} as const;

export const MIN_ARBITRATOR_STAKE = 50000n * 10n ** 18n; // 50,000 KARA
export const BASIS_POINTS = 10000;

// ============ Contract Addresses ============

export interface ContractAddresses {
  karaDispute: Address;
  karaEscrow: Address;
  karaPay: Address;
  karaToken: Address;
}

// Base Mainnet addresses (to be filled after deployment)
export const BASE_MAINNET_ADDRESSES: ContractAddresses = {
  karaDispute: '0x0000000000000000000000000000000000000000' as Address,
  karaEscrow: '0x0000000000000000000000000000000000000000' as Address,
  karaPay: '0x0000000000000000000000000000000000000000' as Address,
  karaToken: KARA_TOKEN_ADDRESS,
};

// Base Sepolia addresses (to be filled after deployment)
export const BASE_SEPOLIA_ADDRESSES: ContractAddresses = {
  karaDispute: '0x0000000000000000000000000000000000000000' as Address,
  karaEscrow: '0x0000000000000000000000000000000000000000' as Address,
  karaPay: '0x0000000000000000000000000000000000000000' as Address,
  karaToken: '0x0000000000000000000000000000000000000000' as Address, // Testnet mock
};

export function getAddresses(chain: 'base' | 'base-sepolia'): ContractAddresses {
  return chain === 'base' ? BASE_MAINNET_ADDRESSES : BASE_SEPOLIA_ADDRESSES;
}

// ============ Chain Config ============

export const CHAINS = {
  base,
  'base-sepolia': baseSepolia,
} as const;

export const DEFAULT_RPC_URLS = {
  base: 'https://mainnet.base.org',
  'base-sepolia': 'https://sepolia.base.org',
} as const;

// ============ Defaults ============

export const DEFAULT_VOTING_PERIOD = 7 * 24 * 60 * 60; // 7 days
export const DEFAULT_ESCROW_DEADLINE = 7 * 24 * 60 * 60; // 7 days
export const DEFAULT_MIN_VOTES = 3;
