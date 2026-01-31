/**
 * @kara/dispute-sdk
 * 
 * TypeScript SDK for KaraDispute - AI-arbitrated dispute resolution on Base.
 * Designed for seamless integration by AI agents.
 * 
 * @example
 * ```typescript
 * import { KaraDispute } from '@kara/dispute-sdk';
 * import { createWalletClient, http } from 'viem';
 * import { privateKeyToAccount } from 'viem/accounts';
 * import { base } from 'viem/chains';
 * 
 * // Create read-only client
 * const kara = new KaraDispute({ chain: 'base' });
 * 
 * // Query dispute
 * const dispute = await kara.getDispute(1n);
 * console.log(dispute.status, dispute.ruling);
 * 
 * // Create write client with wallet
 * const wallet = createWalletClient({
 *   account: privateKeyToAccount('0x...'),
 *   chain: base,
 *   transport: http(),
 * });
 * 
 * const writer = kara.withWallet(wallet);
 * 
 * // Create escrow
 * const { transactionId } = await writer.createEscrow({
 *   payee: '0x...',
 *   amount: parseEther('1'),
 *   description: 'Payment for services',
 *   deadline: BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60),
 * });
 * ```
 * 
 * @packageDocumentation
 */

// Main client
export { KaraDispute, KaraDisputeWriter } from './client';

// Types
export type {
  // Config
  KaraDisputeConfig,
  
  // Params
  CreateEscrowParams,
  CreateDisputeParams,
  RaiseDisputeParams,
  
  // Data types
  Dispute,
  VoteResult,
  ArbitratorStake,
  EscrowTransaction,
  TransactionReceipt,
  
  // Results
  DisputeCreatedResult,
  EscrowCreatedResult,
  
  // Agent types
  AgentDisputeRequest,
  AgentEscrowRequest,
} from './types';

// Enums
export {
  DisputeStatus,
  Ruling,
  TransactionStatus,
} from './types';

// Constants
export {
  KARA_TOKEN_ADDRESS,
  KARA_TIERS,
  MIN_ARBITRATOR_STAKE,
  BASIS_POINTS,
  BASE_MAINNET_ADDRESSES,
  BASE_SEPOLIA_ADDRESSES,
  getAddresses,
  DEFAULT_VOTING_PERIOD,
  DEFAULT_ESCROW_DEADLINE,
  DEFAULT_MIN_VOTES,
} from './constants';

// ABIs
export {
  karaDisputeV2Abi,
  karaEscrowAbi,
  karaPayV2Abi,
  erc20Abi,
} from './abis';
