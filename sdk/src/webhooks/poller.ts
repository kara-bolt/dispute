/**
 * Webhook Poller - Polls chain for dispute events and triggers webhooks
 * @module @kara/dispute-sdk/webhooks
 * 
 * The chain doesn't push events natively, so we poll and emit.
 * 
 * @example
 * ```typescript
 * import { WebhookPoller } from '@kara/dispute-sdk/webhooks';
 * 
 * const poller = new WebhookPoller({
 *   chain: 'base',
 *   pollIntervalMs: 30_000, // 30 seconds
 *   disputeIds: [1n, 2n, 3n], // Monitor specific disputes
 * });
 * 
 * poller.on('dispute.resolved', (event) => {
 *   console.log(`Dispute ${event.data.disputeId} resolved: ${event.data.rulingText}`);
 * });
 * 
 * poller.start();
 * ```
 */

import { parseAbiItem, type PublicClient, type Log } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { randomUUID } from 'crypto';

import { KaraDispute } from '../client';
import { DisputeStatus, Ruling } from '../types';
import type {
  WebhookPollerConfig,
  WebhookEvent,
  WebhookEventType,
  WebhookHandlers,
  WebhookHandler,
  DisputeCreatedEvent,
  DisputeResolvedEvent,
  DisputeVoteCastEvent,
  EscrowCreatedEvent,
  EscrowDisputedEvent,
  EscrowReleasedEvent,
} from './types';

// ============ Event ABIs for parsing ============

const DISPUTE_CREATED_EVENT = parseAbiItem(
  'event DisputeCreated(uint256 indexed disputeId, address indexed claimant, address indexed respondent, uint256 amount)'
);

const DISPUTE_RESOLVED_EVENT = parseAbiItem(
  'event DisputeResolved(uint256 indexed disputeId, uint8 ruling)'
);

const ESCROW_CREATED_EVENT = parseAbiItem(
  'event TransactionCreated(uint256 indexed transactionId, address indexed payer, address indexed payee, uint256 amount)'
);

const ESCROW_DISPUTED_EVENT = parseAbiItem(
  'event TransactionDisputed(uint256 indexed transactionId, uint256 indexed disputeId, address disputedBy)'
);

const ESCROW_RELEASED_EVENT = parseAbiItem(
  'event TransactionReleased(uint256 indexed transactionId, address releasedTo, uint256 amount)'
);

// ============ Dispute State Cache ============

interface DisputeState {
  status: DisputeStatus;
  votes: {
    forClaimant: bigint;
    forRespondent: bigint;
    abstained: bigint;
  };
  lastChecked: number;
}

// ============ WebhookPoller Class ============

export class WebhookPoller {
  private client: KaraDispute;
  private publicClient: PublicClient;
  private config: Required<WebhookPollerConfig>;
  private handlers: Map<WebhookEventType | '*', Set<WebhookHandler<any>>> = new Map();
  private disputeStates: Map<string, DisputeState> = new Map();
  private isRunning = false;
  private pollTimer?: NodeJS.Timeout;
  private lastBlockNumber: bigint = 0n;
  private chainId: number;

  constructor(config: WebhookPollerConfig) {
    this.config = {
      chain: config.chain,
      rpcUrl: config.rpcUrl ?? undefined,
      pollIntervalMs: config.pollIntervalMs ?? 30_000,
      disputeIds: config.disputeIds ?? [],
      addresses: config.addresses ?? [],
      fromBlock: config.fromBlock ?? 0n,
    } as Required<WebhookPollerConfig>;

    this.client = new KaraDispute({
      chain: config.chain,
      rpcUrl: config.rpcUrl,
    });

    const chain = config.chain === 'base' ? base : baseSepolia;
    this.chainId = chain.id;
    
    // Reuse the client's publicClient to avoid type mismatches
    this.publicClient = this.client.publicClient;

    this.lastBlockNumber = this.config.fromBlock;
  }

  // ============ Event Subscription ============

  /**
   * Subscribe to a specific event type
   */
  on<T extends WebhookEventType>(
    eventType: T,
    handler: WebhookHandler<Extract<WebhookEvent, { type: T }>>
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: WebhookHandler<WebhookEvent>): () => void {
    if (!this.handlers.has('*')) {
      this.handlers.set('*', new Set());
    }
    this.handlers.get('*')!.add(handler);

    return () => {
      this.handlers.get('*')?.delete(handler);
    };
  }

  /**
   * Subscribe to multiple event types at once
   */
  subscribe(handlers: WebhookHandlers): () => void {
    const unsubscribers: (() => void)[] = [];

    for (const [eventType, handler] of Object.entries(handlers)) {
      if (handler) {
        if (eventType === '*') {
          unsubscribers.push(this.onAll(handler));
        } else {
          unsubscribers.push(this.on(eventType as WebhookEventType, handler as any));
        }
      }
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }

  // ============ Lifecycle ============

  /**
   * Start polling
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log(`[WebhookPoller] Starting on ${this.config.chain}...`);

    // Initial poll
    await this.poll();

    // Set up interval
    this.pollTimer = setInterval(() => {
      this.poll().catch(console.error);
    }, this.config.pollIntervalMs);
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    console.log('[WebhookPoller] Stopped');
  }

  /**
   * Check if running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Add a dispute to monitor
   */
  addDispute(disputeId: bigint): void {
    if (!this.config.disputeIds.includes(disputeId)) {
      this.config.disputeIds.push(disputeId);
    }
  }

  /**
   * Remove a dispute from monitoring
   */
  removeDispute(disputeId: bigint): void {
    const index = this.config.disputeIds.indexOf(disputeId);
    if (index > -1) {
      this.config.disputeIds.splice(index, 1);
      this.disputeStates.delete(disputeId.toString());
    }
  }

  // ============ Polling Logic ============

  private async poll(): Promise<void> {
    try {
      // Get current block
      const currentBlock = await this.publicClient.getBlockNumber();

      // Check monitored disputes for state changes
      await this.checkDisputeStates();

      // Update last block
      this.lastBlockNumber = currentBlock;
    } catch (error) {
      console.error('[WebhookPoller] Poll error:', error);
    }
  }

  private async checkDisputeStates(): Promise<void> {
    const disputeIds = [...this.config.disputeIds];

    // Also get disputes involving monitored addresses
    // (Would need to query events or maintain a list)

    for (const disputeId of disputeIds) {
      try {
        const dispute = await this.client.getDispute(disputeId);
        const votes = await this.client.getVoteResult(disputeId);
        const key = disputeId.toString();
        const prevState = this.disputeStates.get(key);

        const newState: DisputeState = {
          status: dispute.status,
          votes: {
            forClaimant: votes.forClaimant,
            forRespondent: votes.forRespondent,
            abstained: votes.abstained,
          },
          lastChecked: Date.now(),
        };

        if (prevState) {
          // Check for vote changes
          if (
            newState.votes.forClaimant !== prevState.votes.forClaimant ||
            newState.votes.forRespondent !== prevState.votes.forRespondent ||
            newState.votes.abstained !== prevState.votes.abstained
          ) {
            // Votes changed
            const voteEvent: WebhookEvent = {
              type: 'dispute.vote_cast',
              eventId: randomUUID(),
              timestamp: Math.floor(Date.now() / 1000),
              chainId: this.chainId,
              data: {
                disputeId,
                voter: '0x0000000000000000000000000000000000000000', // Unknown from polling
                vote: this.inferVoteType(prevState.votes, newState.votes),
                currentVotes: newState.votes,
              },
            };
            this.emit(voteEvent);
          }

          // Check for status changes
          if (newState.status !== prevState.status) {
            if (newState.status === DisputeStatus.Resolved) {
              const resolvedEvent: DisputeResolvedEvent = {
                type: 'dispute.resolved',
                eventId: randomUUID(),
                timestamp: Math.floor(Date.now() / 1000),
                chainId: this.chainId,
                data: {
                  disputeId,
                  ruling: dispute.ruling,
                  rulingText: this.rulingToText(dispute.ruling),
                  finalVotes: newState.votes,
                },
              };
              this.emit(resolvedEvent);
            } else if (newState.status === DisputeStatus.Appealed) {
              this.emit({
                type: 'dispute.appealed',
                eventId: randomUUID(),
                timestamp: Math.floor(Date.now() / 1000),
                chainId: this.chainId,
                data: {
                  disputeId,
                  appellant: '0x0000000000000000000000000000000000000000',
                  appealRound: dispute.appealRound,
                  newVotingDeadline: dispute.votingDeadline,
                },
              });
            } else if (newState.status === DisputeStatus.Voting && prevState.status === DisputeStatus.Open) {
              this.emit({
                type: 'dispute.voting_started',
                eventId: randomUUID(),
                timestamp: Math.floor(Date.now() / 1000),
                chainId: this.chainId,
                data: {
                  disputeId,
                  votingDeadline: dispute.votingDeadline,
                  requiredVotes: dispute.requiredVotes,
                },
              });
            }
          }
        } else {
          // First time seeing this dispute - it was just created
          const createdEvent: DisputeCreatedEvent = {
            type: 'dispute.created',
            eventId: randomUUID(),
            timestamp: Math.floor(Date.now() / 1000),
            chainId: this.chainId,
            data: {
              disputeId,
              claimant: dispute.claimant,
              respondent: dispute.respondent,
              amount: dispute.amount,
              evidenceURI: dispute.evidenceURI,
              votingDeadline: dispute.votingDeadline,
            },
          };
          this.emit(createdEvent);
        }

        // Update cache
        this.disputeStates.set(key, newState);
      } catch (error) {
        console.error(`[WebhookPoller] Error checking dispute ${disputeId}:`, error);
      }
    }
  }

  private inferVoteType(
    prev: { forClaimant: bigint; forRespondent: bigint; abstained: bigint },
    next: { forClaimant: bigint; forRespondent: bigint; abstained: bigint }
  ): 'claimant' | 'respondent' | 'abstain' {
    if (next.forClaimant > prev.forClaimant) return 'claimant';
    if (next.forRespondent > prev.forRespondent) return 'respondent';
    return 'abstain';
  }

  private rulingToText(ruling: Ruling): 'claimant' | 'respondent' | 'refused' {
    switch (ruling) {
      case Ruling.Claimant:
        return 'claimant';
      case Ruling.Respondent:
        return 'respondent';
      default:
        return 'refused';
    }
  }

  private emit(event: WebhookEvent): void {
    // Call specific handlers
    const specificHandlers = this.handlers.get(event.type);
    if (specificHandlers) {
      for (const handler of specificHandlers) {
        try {
          const result = handler(event);
          if (result instanceof Promise) {
            result.catch(console.error);
          }
        } catch (error) {
          console.error(`[WebhookPoller] Handler error for ${event.type}:`, error);
        }
      }
    }

    // Call wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          const result = handler(event);
          if (result instanceof Promise) {
            result.catch(console.error);
          }
        } catch (error) {
          console.error(`[WebhookPoller] Wildcard handler error:`, error);
        }
      }
    }
  }
}
