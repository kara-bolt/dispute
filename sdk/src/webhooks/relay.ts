/**
 * Webhook Relay - Receives events and forwards to registered webhooks
 * @module @kara/dispute-sdk/webhooks
 * 
 * Run as a standalone service to forward dispute events to your agent's webhook URL.
 * 
 * @example
 * ```typescript
 * import { WebhookRelay, WebhookPoller } from '@kara/dispute-sdk/webhooks';
 * 
 * // Create poller
 * const poller = new WebhookPoller({ chain: 'base' });
 * 
 * // Create relay
 * const relay = new WebhookRelay();
 * 
 * // Register a webhook
 * relay.register({
 *   url: 'https://my-agent.com/webhooks/karadispute',
 *   events: ['dispute.resolved', 'dispute.appealed'],
 *   secret: 'my-webhook-secret',
 * });
 * 
 * // Connect poller to relay
 * poller.onAll((event) => relay.dispatch(event));
 * 
 * // Start
 * poller.start();
 * ```
 */

import { createHmac, randomUUID } from 'crypto';
import type {
  WebhookEvent,
  WebhookEventType,
  WebhookSubscription,
  WebhookDelivery,
} from './types';

// ============ Relay Configuration ============

export interface WebhookRelayConfig {
  /** Maximum retry attempts */
  maxRetries?: number;
  
  /** Retry delay in ms (exponential backoff applied) */
  retryDelayMs?: number;
  
  /** Request timeout in ms */
  timeoutMs?: number;
  
  /** Store delivery history */
  storeHistory?: boolean;
  
  /** Max history entries to keep */
  maxHistoryEntries?: number;
}

export interface RegisterWebhookParams {
  /** Webhook URL */
  url: string;
  
  /** Events to receive (empty = all) */
  events?: WebhookEventType[];
  
  /** Filter by addresses (optional) */
  filterAddresses?: `0x${string}`[];
  
  /** Filter by dispute IDs (optional) */
  filterDisputeIds?: bigint[];
  
  /** Secret for HMAC signature */
  secret?: string;
}

// ============ WebhookRelay Class ============

export class WebhookRelay {
  private subscriptions: Map<string, WebhookSubscription> = new Map();
  private deliveryHistory: WebhookDelivery[] = [];
  private config: Required<WebhookRelayConfig>;
  private pendingDeliveries: Map<string, Promise<void>> = new Map();

  constructor(config: WebhookRelayConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
      timeoutMs: config.timeoutMs ?? 10000,
      storeHistory: config.storeHistory ?? true,
      maxHistoryEntries: config.maxHistoryEntries ?? 1000,
    };
  }

  // ============ Subscription Management ============

  /**
   * Register a new webhook
   */
  register(params: RegisterWebhookParams): WebhookSubscription {
    const subscription: WebhookSubscription = {
      id: randomUUID(),
      url: params.url,
      events: params.events ?? [],
      filterAddresses: params.filterAddresses,
      filterDisputeIds: params.filterDisputeIds,
      secret: params.secret,
      active: true,
      createdAt: Math.floor(Date.now() / 1000),
    };

    this.subscriptions.set(subscription.id, subscription);
    console.log(`[WebhookRelay] Registered webhook: ${subscription.id} -> ${params.url}`);
    
    return subscription;
  }

  /**
   * Unregister a webhook
   */
  unregister(subscriptionId: string): boolean {
    const deleted = this.subscriptions.delete(subscriptionId);
    if (deleted) {
      console.log(`[WebhookRelay] Unregistered webhook: ${subscriptionId}`);
    }
    return deleted;
  }

  /**
   * Get all subscriptions
   */
  getSubscriptions(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Get subscription by ID
   */
  getSubscription(id: string): WebhookSubscription | undefined {
    return this.subscriptions.get(id);
  }

  /**
   * Pause a subscription
   */
  pause(subscriptionId: string): boolean {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub) {
      sub.active = false;
      return true;
    }
    return false;
  }

  /**
   * Resume a subscription
   */
  resume(subscriptionId: string): boolean {
    const sub = this.subscriptions.get(subscriptionId);
    if (sub) {
      sub.active = true;
      return true;
    }
    return false;
  }

  // ============ Event Dispatch ============

  /**
   * Dispatch an event to all matching webhooks
   */
  async dispatch(event: WebhookEvent): Promise<void> {
    const matchingSubscriptions = this.findMatchingSubscriptions(event);

    const deliveries = matchingSubscriptions.map(sub =>
      this.deliverToSubscription(sub, event)
    );

    await Promise.allSettled(deliveries);
  }

  private findMatchingSubscriptions(event: WebhookEvent): WebhookSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => {
      // Must be active
      if (!sub.active) return false;

      // Check event type filter
      if (sub.events.length > 0 && !sub.events.includes(event.type)) {
        return false;
      }

      // Check address filter
      if (sub.filterAddresses && sub.filterAddresses.length > 0) {
        const eventAddresses = this.extractAddresses(event);
        const hasMatch = sub.filterAddresses.some(addr =>
          eventAddresses.includes(addr.toLowerCase() as `0x${string}`)
        );
        if (!hasMatch) return false;
      }

      // Check dispute ID filter
      if (sub.filterDisputeIds && sub.filterDisputeIds.length > 0) {
        const disputeId = this.extractDisputeId(event);
        if (disputeId && !sub.filterDisputeIds.includes(disputeId)) {
          return false;
        }
      }

      return true;
    });
  }

  private extractAddresses(event: WebhookEvent): `0x${string}`[] {
    const data = event.data as any;
    const addresses: `0x${string}`[] = [];
    
    if (data.claimant) addresses.push(data.claimant.toLowerCase());
    if (data.respondent) addresses.push(data.respondent.toLowerCase());
    if (data.payer) addresses.push(data.payer.toLowerCase());
    if (data.payee) addresses.push(data.payee.toLowerCase());
    if (data.voter) addresses.push(data.voter.toLowerCase());
    
    return addresses;
  }

  private extractDisputeId(event: WebhookEvent): bigint | undefined {
    const data = event.data as any;
    return data.disputeId;
  }

  private async deliverToSubscription(
    subscription: WebhookSubscription,
    event: WebhookEvent
  ): Promise<void> {
    const deliveryId = randomUUID();
    let attempt = 0;
    let success = false;
    let lastError: string | undefined;
    let statusCode: number | undefined;

    while (attempt < this.config.maxRetries && !success) {
      attempt++;
      
      try {
        const response = await this.sendWebhook(subscription, event, deliveryId);
        statusCode = response.status;
        
        if (response.ok) {
          success = true;
        } else {
          lastError = `HTTP ${response.status}: ${response.statusText}`;
          await this.sleep(this.config.retryDelayMs * Math.pow(2, attempt - 1));
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        await this.sleep(this.config.retryDelayMs * Math.pow(2, attempt - 1));
      }
    }

    // Record delivery
    if (this.config.storeHistory) {
      const delivery: WebhookDelivery = {
        deliveryId,
        eventId: event.eventId,
        subscriptionId: subscription.id,
        statusCode,
        success,
        error: lastError,
        attempt,
        timestamp: Math.floor(Date.now() / 1000),
      };

      this.deliveryHistory.push(delivery);

      // Trim history
      if (this.deliveryHistory.length > this.config.maxHistoryEntries) {
        this.deliveryHistory = this.deliveryHistory.slice(-this.config.maxHistoryEntries);
      }
    }

    if (!success) {
      console.error(
        `[WebhookRelay] Failed to deliver ${event.type} to ${subscription.url}: ${lastError}`
      );
    }
  }

  private async sendWebhook(
    subscription: WebhookSubscription,
    event: WebhookEvent,
    deliveryId: string
  ): Promise<Response> {
    // Serialize event (convert bigints to strings)
    const payload = JSON.stringify(event, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': event.type,
      'X-Webhook-Delivery': deliveryId,
      'X-Webhook-Timestamp': event.timestamp.toString(),
    };

    // Add HMAC signature if secret is configured
    if (subscription.secret) {
      const signature = this.signPayload(payload, subscription.secret);
      headers['X-Webhook-Signature'] = signature;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers,
        body: payload,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private signPayload(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============ History ============

  /**
   * Get delivery history
   */
  getHistory(options?: {
    subscriptionId?: string;
    eventId?: string;
    successOnly?: boolean;
    limit?: number;
  }): WebhookDelivery[] {
    let history = [...this.deliveryHistory];

    if (options?.subscriptionId) {
      history = history.filter(d => d.subscriptionId === options.subscriptionId);
    }
    if (options?.eventId) {
      history = history.filter(d => d.eventId === options.eventId);
    }
    if (options?.successOnly !== undefined) {
      history = history.filter(d => d.success === options.successOnly);
    }
    if (options?.limit) {
      history = history.slice(-options.limit);
    }

    return history;
  }

  /**
   * Clear delivery history
   */
  clearHistory(): void {
    this.deliveryHistory = [];
  }
}

// ============ Signature Verification Helper ============

/**
 * Verify webhook signature (for use in your webhook handler)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const expectedSignature = `sha256=${expected}`;
  
  // Constant-time comparison
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  
  return result === 0;
}
