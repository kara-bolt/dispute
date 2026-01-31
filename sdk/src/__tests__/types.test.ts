/**
 * KaraDispute SDK Types Tests
 * 
 * These tests verify type definitions are correct and usable
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import { zeroAddress, type Address, type Hash } from 'viem';
import type {
  Dispute,
  EscrowTransaction,
  VoteResult,
  ArbitratorStake,
  KaraDisputeConfig,
  CreateEscrowParams,
  CreateDisputeParams,
  RaiseDisputeParams,
  AgentDisputeRequest,
  AgentEscrowRequest,
  DisputeStatus,
  TransactionStatus,
  Ruling,
} from '../types';

describe('Type definitions', () => {
  describe('Dispute', () => {
    it('should accept valid Dispute object', () => {
      const dispute: Dispute = {
        id: 1n,
        claimant: zeroAddress,
        respondent: zeroAddress,
        arbitrable: zeroAddress,
        amount: 1000000000000000000n,
        evidenceURI: 'ipfs://QmTest',
        status: 0 as DisputeStatus,
        ruling: 0 as Ruling,
        createdAt: 1700000000n,
        resolvedAt: 0n,
        votingDeadline: 1700100000n,
        appealRound: 0,
        requiredVotes: 3n,
        karaFeePaid: 100000000000000000n,
      };

      expect(dispute.id).toBe(1n);
      expect(dispute.status).toBe(0);
    });
  });

  describe('EscrowTransaction', () => {
    it('should accept valid EscrowTransaction object', () => {
      const escrow: EscrowTransaction = {
        id: 1n,
        payer: zeroAddress,
        payee: '0x1234567890123456789012345678901234567890' as Address,
        token: zeroAddress,
        amount: 1000000000000000000n,
        status: 1 as TransactionStatus,
        disputeId: 0n,
        description: 'Test payment',
        deadline: 1700100000n,
        createdAt: 1700000000n,
      };

      expect(escrow.description).toBe('Test payment');
      expect(typeof escrow.amount).toBe('bigint');
    });
  });

  describe('VoteResult', () => {
    it('should accept valid VoteResult object', () => {
      const voteResult: VoteResult = {
        forClaimant: 2n,
        forRespondent: 1n,
        abstained: 0n,
        agentIds: ['0x1234' as `0x${string}`, '0x5678' as `0x${string}`],
        signatures: ['0xabcd' as `0x${string}`],
      };

      expect(voteResult.forClaimant).toBe(2n);
      expect(voteResult.agentIds.length).toBe(2);
    });
  });

  describe('ArbitratorStake', () => {
    it('should accept valid ArbitratorStake object', () => {
      const stake: ArbitratorStake = {
        amount: 10000000000000000000000n, // 10000 KARA
        stakedAt: 1700000000n,
        lockedUntil: 0n,
        slashedAmount: 0n,
        active: true,
      };

      expect(stake.active).toBe(true);
      expect(stake.amount).toBeGreaterThan(0n);
    });
  });

  describe('KaraDisputeConfig', () => {
    it('should accept minimal config', () => {
      const config: KaraDisputeConfig = {
        chain: 'base',
      };

      expect(config.chain).toBe('base');
    });

    it('should accept full config', () => {
      const config: KaraDisputeConfig = {
        chain: 'base-sepolia',
        rpcUrl: 'https://custom-rpc.example.com',
        addresses: {
          karaDispute: zeroAddress,
          karaEscrow: zeroAddress,
        },
      };

      expect(config.rpcUrl).toBeDefined();
    });
  });

  describe('CreateEscrowParams', () => {
    it('should accept valid params', () => {
      const params: CreateEscrowParams = {
        payee: '0x1234567890123456789012345678901234567890' as Address,
        amount: 1000000000000000000n,
        description: 'Payment for services',
        deadline: 1700100000n,
      };

      expect(params.payee).toBeDefined();
      expect(params.token).toBeUndefined(); // Optional
    });

    it('should accept params with token', () => {
      const params: CreateEscrowParams = {
        payee: '0x1234567890123456789012345678901234567890' as Address,
        token: '0xabcdef1234567890123456789012345678901234' as Address,
        amount: 1000000n,
        description: 'USDC payment',
        deadline: 1700100000n,
      };

      expect(params.token).toBeDefined();
    });
  });

  describe('AgentDisputeRequest', () => {
    it('should accept minimal agent request', () => {
      const request: AgentDisputeRequest = {
        from: zeroAddress,
        counterparty: '0x1234567890123456789012345678901234567890' as Address,
        amount: 1000000000000000000n,
        description: 'Service not delivered',
      };

      expect(request.description).toBe('Service not delivered');
      expect(request.evidence).toBeUndefined();
    });

    it('should accept request with evidence', () => {
      const request: AgentDisputeRequest = {
        from: zeroAddress,
        counterparty: '0x1234567890123456789012345678901234567890' as Address,
        amount: 1000000000000000000n,
        description: 'Service not delivered',
        evidence: {
          messages: ['msg1', 'msg2'],
          contract: 'ipfs://QmContract',
        },
      };

      expect(request.evidence).toBeDefined();
      expect(request.evidence?.messages).toHaveLength(2);
    });
  });

  describe('AgentEscrowRequest', () => {
    it('should accept minimal request', () => {
      const request: AgentEscrowRequest = {
        from: zeroAddress,
        to: '0x1234567890123456789012345678901234567890' as Address,
        amount: 1000000000000000000n,
        description: 'Payment for code review',
      };

      expect(request.deadlineSeconds).toBeUndefined();
    });

    it('should accept request with custom deadline', () => {
      const request: AgentEscrowRequest = {
        from: zeroAddress,
        to: '0x1234567890123456789012345678901234567890' as Address,
        amount: 1000000000000000000n,
        description: 'Payment for code review',
        deadlineSeconds: 3 * 24 * 60 * 60, // 3 days
      };

      expect(request.deadlineSeconds).toBe(259200);
    });
  });
});
