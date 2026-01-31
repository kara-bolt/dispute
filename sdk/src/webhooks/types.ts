/**
 * Webhook Types for KaraDispute
 * @module @kara/dispute-sdk/webhooks
 */

import type { Address, Hash } from 'viem';
import type { DisputeStatus, Ruling } from '../types';

// ============ Webhook Event Types ============

export type WebhookEventType =
  | 'dispute.created'
  | 'dispute.voting_started'
  | 'dispute.vote_cast'
  | 'dispute.resolved'
  | 'dispute.appealed'
  | 'escrow.created'
  | 'escrow.funded'
  | 'escrow.disputed'
  | 'escrow.released'
  | 'escrow.cancelled';

export interface WebhookEventBase {
  /** Event type */
  type: WebhookEventType;
  
  /** Unique event ID */
  eventId: string;
  
  /** Unix timestamp (seconds) */
  timestamp: number;
  
  /** Chain ID */
  chainId: number;
  
  /** Transaction hash that triggered this event */
  txHash?: Hash;
  
  /** Block number */
  blockNumber?: bigint;
}

// ============ Dispute Events ============

export interface DisputeCreatedEvent extends WebhookEventBase {
  type: 'dispute.created';
  data: {
    disputeId: bigint;
    claimant: Address;
    respondent: Address;
    amount: bigint;
    evidenceURI: string;
    votingDeadline: bigint;
  };
}

export interface DisputeVotingStartedEvent extends WebhookEventBase {
  type: 'dispute.voting_started';
  data: {
    disputeId: bigint;
    votingDeadline: bigint;
    requiredVotes: bigint;
  };
}

export interface DisputeVoteCastEvent extends WebhookEventBase {
  type: 'dispute.vote_cast';
  data: {
    disputeId: bigint;
    voter: Address;
    vote: 'claimant' | 'respondent' | 'abstain';
    currentVotes: {
      forClaimant: bigint;
      forRespondent: bigint;
      abstained: bigint;
    };
  };
}

export interface DisputeResolvedEvent extends WebhookEventBase {
  type: 'dispute.resolved';
  data: {
    disputeId: bigint;
    ruling: Ruling;
    rulingText: 'claimant' | 'respondent' | 'refused';
    finalVotes: {
      forClaimant: bigint;
      forRespondent: bigint;
      abstained: bigint;
    };
  };
}

export interface DisputeAppealedEvent extends WebhookEventBase {
  type: 'dispute.appealed';
  data: {
    disputeId: bigint;
    appellant: Address;
    appealRound: number;
    newVotingDeadline: bigint;
  };
}

// ============ Escrow Events ============

export interface EscrowCreatedEvent extends WebhookEventBase {
  type: 'escrow.created';
  data: {
    transactionId: bigint;
    payer: Address;
    payee: Address;
    token: Address;
    amount: bigint;
    description: string;
    deadline: bigint;
  };
}

export interface EscrowFundedEvent extends WebhookEventBase {
  type: 'escrow.funded';
  data: {
    transactionId: bigint;
    amount: bigint;
  };
}

export interface EscrowDisputedEvent extends WebhookEventBase {
  type: 'escrow.disputed';
  data: {
    transactionId: bigint;
    disputeId: bigint;
    disputedBy: Address;
    evidenceURI: string;
  };
}

export interface EscrowReleasedEvent extends WebhookEventBase {
  type: 'escrow.released';
  data: {
    transactionId: bigint;
    releasedTo: Address;
    amount: bigint;
  };
}

export interface EscrowCancelledEvent extends WebhookEventBase {
  type: 'escrow.cancelled';
  data: {
    transactionId: bigint;
    cancelledBy: Address;
  };
}

// ============ Union Type ============

export type WebhookEvent =
  | DisputeCreatedEvent
  | DisputeVotingStartedEvent
  | DisputeVoteCastEvent
  | DisputeResolvedEvent
  | DisputeAppealedEvent
  | EscrowCreatedEvent
  | EscrowFundedEvent
  | EscrowDisputedEvent
  | EscrowReleasedEvent
  | EscrowCancelledEvent;

// ============ Webhook Registration ============

export interface WebhookSubscription {
  /** Unique subscription ID */
  id: string;
  
  /** Webhook URL to call */
  url: string;
  
  /** Events to subscribe to (empty = all) */
  events: WebhookEventType[];
  
  /** Filter by specific addresses (optional) */
  filterAddresses?: Address[];
  
  /** Filter by specific dispute IDs (optional) */
  filterDisputeIds?: bigint[];
  
  /** Secret for HMAC signature verification */
  secret?: string;
  
  /** Whether subscription is active */
  active: boolean;
  
  /** Created timestamp */
  createdAt: number;
}

export interface WebhookDelivery {
  /** Delivery attempt ID */
  deliveryId: string;
  
  /** Event ID */
  eventId: string;
  
  /** Subscription ID */
  subscriptionId: string;
  
  /** HTTP status code received */
  statusCode?: number;
  
  /** Whether delivery succeeded */
  success: boolean;
  
  /** Error message if failed */
  error?: string;
  
  /** Attempt number */
  attempt: number;
  
  /** Timestamp */
  timestamp: number;
}

// ============ Webhook Handler Types ============

export type WebhookHandler<T extends WebhookEvent = WebhookEvent> = (
  event: T
) => void | Promise<void>;

export interface WebhookHandlers {
  'dispute.created'?: WebhookHandler<DisputeCreatedEvent>;
  'dispute.voting_started'?: WebhookHandler<DisputeVotingStartedEvent>;
  'dispute.vote_cast'?: WebhookHandler<DisputeVoteCastEvent>;
  'dispute.resolved'?: WebhookHandler<DisputeResolvedEvent>;
  'dispute.appealed'?: WebhookHandler<DisputeAppealedEvent>;
  'escrow.created'?: WebhookHandler<EscrowCreatedEvent>;
  'escrow.funded'?: WebhookHandler<EscrowFundedEvent>;
  'escrow.disputed'?: WebhookHandler<EscrowDisputedEvent>;
  'escrow.released'?: WebhookHandler<EscrowReleasedEvent>;
  'escrow.cancelled'?: WebhookHandler<EscrowCancelledEvent>;
  '*'?: WebhookHandler<WebhookEvent>;
}

// ============ Poller Config ============

export interface WebhookPollerConfig {
  /** Chain to monitor */
  chain: 'base' | 'base-sepolia';
  
  /** Custom RPC URL */
  rpcUrl?: string;
  
  /** Poll interval in milliseconds */
  pollIntervalMs?: number;
  
  /** Dispute IDs to monitor (empty = all new) */
  disputeIds?: bigint[];
  
  /** Addresses to monitor (claimant or respondent) */
  addresses?: Address[];
  
  /** Start from block number */
  fromBlock?: bigint;
}
