/**
 * Webhook support for KaraDispute SDK
 * @module @kara/dispute-sdk/webhooks
 * 
 * Poll for dispute events and forward to your webhook endpoints.
 * 
 * @example
 * ```typescript
 * import { WebhookPoller, WebhookRelay, verifyWebhookSignature } from '@kara/dispute-sdk/webhooks';
 * 
 * // Create a poller that watches for dispute events
 * const poller = new WebhookPoller({
 *   chain: 'base',
 *   pollIntervalMs: 30_000,
 *   disputeIds: [1n, 2n], // Monitor specific disputes
 * });
 * 
 * // Create a relay to forward events to your webhook URL
 * const relay = new WebhookRelay();
 * relay.register({
 *   url: 'https://my-agent.com/webhooks/dispute',
 *   events: ['dispute.resolved'],
 *   secret: 'my-secret',
 * });
 * 
 * // Connect them
 * poller.onAll((event) => relay.dispatch(event));
 * 
 * // Start watching
 * poller.start();
 * ```
 */

export { WebhookPoller } from './poller';
export { WebhookRelay, verifyWebhookSignature } from './relay';

export type {
  // Event types
  WebhookEventType,
  WebhookEventBase,
  WebhookEvent,
  
  // Specific events
  DisputeCreatedEvent,
  DisputeVotingStartedEvent,
  DisputeVoteCastEvent,
  DisputeResolvedEvent,
  DisputeAppealedEvent,
  EscrowCreatedEvent,
  EscrowFundedEvent,
  EscrowDisputedEvent,
  EscrowReleasedEvent,
  EscrowCancelledEvent,
  
  // Subscription types
  WebhookSubscription,
  WebhookDelivery,
  
  // Handler types
  WebhookHandler,
  WebhookHandlers,
  
  // Config
  WebhookPollerConfig,
} from './types';

export type { WebhookRelayConfig, RegisterWebhookParams } from './relay';
