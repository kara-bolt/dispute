/**
 * Webhook Module Tests
 * @module @kara/dispute-sdk/webhooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebhookRelay, verifyWebhookSignature } from '../webhooks/relay';
import type {
  WebhookEvent,
  WebhookEventType,
  DisputeCreatedEvent,
  DisputeResolvedEvent,
  EscrowCreatedEvent,
  WebhookSubscription,
} from '../webhooks/types';
import { Ruling } from '../types';

// ============ Test Helpers ============

function createMockEvent(
  type: WebhookEventType,
  data: Record<string, unknown> = {}
): WebhookEvent {
  const baseEvent = {
    eventId: `evt_${Math.random().toString(36).slice(2)}`,
    timestamp: Math.floor(Date.now() / 1000),
    chainId: 8453,
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as const,
    blockNumber: 12345678n,
  };

  switch (type) {
    case 'dispute.created':
      return {
        ...baseEvent,
        type: 'dispute.created',
        data: {
          disputeId: 1n,
          claimant: '0xClaimant0000000000000000000000000000001',
          respondent: '0xRespondent00000000000000000000000000002',
          amount: 1000000000000000000n,
          evidenceURI: 'ipfs://Qm...',
          votingDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
          ...data,
        },
      } as DisputeCreatedEvent;

    case 'dispute.resolved':
      return {
        ...baseEvent,
        type: 'dispute.resolved',
        data: {
          disputeId: 1n,
          ruling: Ruling.Claimant,
          rulingText: 'claimant',
          finalVotes: {
            forClaimant: 3n,
            forRespondent: 1n,
            abstained: 0n,
          },
          ...data,
        },
      } as DisputeResolvedEvent;

    case 'escrow.created':
      return {
        ...baseEvent,
        type: 'escrow.created',
        data: {
          transactionId: 1n,
          payer: '0xPayer00000000000000000000000000000000001',
          payee: '0xPayee00000000000000000000000000000000002',
          token: '0x0000000000000000000000000000000000000000',
          amount: 1000000000000000000n,
          description: 'Test escrow',
          deadline: BigInt(Math.floor(Date.now() / 1000) + 86400),
          ...data,
        },
      } as EscrowCreatedEvent;

    default:
      return {
        ...baseEvent,
        type,
        data,
      } as WebhookEvent;
  }
}

// ============ WebhookRelay Tests ============

describe('WebhookRelay', () => {
  let relay: WebhookRelay;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    relay = new WebhookRelay({
      maxRetries: 2,
      retryDelayMs: 10,
      timeoutMs: 1000,
      storeHistory: true,
    });

    // Mock fetch globally
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('Subscription Management', () => {
    it('should register a webhook subscription', () => {
      const sub = relay.register({
        url: 'https://example.com/webhook',
        events: ['dispute.created', 'dispute.resolved'],
      });

      expect(sub.id).toBeDefined();
      expect(sub.url).toBe('https://example.com/webhook');
      expect(sub.events).toEqual(['dispute.created', 'dispute.resolved']);
      expect(sub.active).toBe(true);
      expect(sub.createdAt).toBeGreaterThan(0);
    });

    it('should unregister a webhook', () => {
      const sub = relay.register({ url: 'https://example.com/webhook' });
      expect(relay.getSubscriptions()).toHaveLength(1);

      const deleted = relay.unregister(sub.id);
      expect(deleted).toBe(true);
      expect(relay.getSubscriptions()).toHaveLength(0);
    });

    it('should return false when unregistering non-existent subscription', () => {
      const deleted = relay.unregister('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should get subscription by ID', () => {
      const sub = relay.register({ url: 'https://example.com/webhook' });
      const found = relay.getSubscription(sub.id);
      expect(found).toEqual(sub);
    });

    it('should pause and resume subscription', () => {
      const sub = relay.register({ url: 'https://example.com/webhook' });
      expect(sub.active).toBe(true);

      relay.pause(sub.id);
      expect(relay.getSubscription(sub.id)?.active).toBe(false);

      relay.resume(sub.id);
      expect(relay.getSubscription(sub.id)?.active).toBe(true);
    });

    it('should register with filters', () => {
      const sub = relay.register({
        url: 'https://example.com/webhook',
        filterAddresses: ['0x1234567890123456789012345678901234567890'],
        filterDisputeIds: [1n, 2n, 3n],
        secret: 'my-secret',
      });

      expect(sub.filterAddresses).toEqual(['0x1234567890123456789012345678901234567890']);
      expect(sub.filterDisputeIds).toEqual([1n, 2n, 3n]);
      expect(sub.secret).toBe('my-secret');
    });
  });

  describe('Event Dispatch', () => {
    it('should dispatch event to matching subscription', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
      });

      relay.register({
        url: 'https://example.com/webhook',
        events: ['dispute.created'],
      });

      const event = createMockEvent('dispute.created');
      await relay.dispatch(event);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Event': 'dispute.created',
          }),
        })
      );
    });

    it('should not dispatch to paused subscription', async () => {
      const sub = relay.register({
        url: 'https://example.com/webhook',
        events: ['dispute.created'],
      });

      relay.pause(sub.id);

      const event = createMockEvent('dispute.created');
      await relay.dispatch(event);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should filter by event type', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      relay.register({
        url: 'https://example.com/webhook',
        events: ['dispute.resolved'],
      });

      // Should not dispatch - wrong event type
      await relay.dispatch(createMockEvent('dispute.created'));
      expect(mockFetch).not.toHaveBeenCalled();

      // Should dispatch - matching event type
      await relay.dispatch(createMockEvent('dispute.resolved'));
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should dispatch to all matching subscriptions', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      relay.register({ url: 'https://example1.com/webhook' });
      relay.register({ url: 'https://example2.com/webhook' });
      relay.register({ url: 'https://example3.com/webhook' });

      await relay.dispatch(createMockEvent('dispute.created'));

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should filter by address', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      relay.register({
        url: 'https://example.com/webhook',
        filterAddresses: ['0xClaimant0000000000000000000000000000001'],
      });

      // Should dispatch - address matches claimant
      await relay.dispatch(createMockEvent('dispute.created', {
        claimant: '0xClaimant0000000000000000000000000000001',
      }));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      mockFetch.mockClear();

      // Should not dispatch - address doesn't match
      await relay.dispatch(createMockEvent('dispute.created', {
        claimant: '0xOther000000000000000000000000000000003',
        respondent: '0xOther000000000000000000000000000000004',
      }));
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should filter by dispute ID', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      relay.register({
        url: 'https://example.com/webhook',
        filterDisputeIds: [1n, 5n, 10n],
      });

      // Should dispatch - dispute ID matches
      await relay.dispatch(createMockEvent('dispute.created', { disputeId: 5n }));
      expect(mockFetch).toHaveBeenCalledTimes(1);

      mockFetch.mockClear();

      // Should not dispatch - dispute ID doesn't match
      await relay.dispatch(createMockEvent('dispute.created', { disputeId: 99n }));
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      relay.register({ url: 'https://example.com/webhook' });
      await relay.dispatch(createMockEvent('dispute.created'));

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on non-2xx response', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      relay.register({ url: 'https://example.com/webhook' });
      await relay.dispatch(createMockEvent('dispute.created'));

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should give up after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent error'));

      relay.register({ url: 'https://example.com/webhook' });
      await relay.dispatch(createMockEvent('dispute.created'));

      expect(mockFetch).toHaveBeenCalledTimes(2); // maxRetries: 2
    });
  });

  describe('HMAC Signature', () => {
    it('should include signature header when secret is set', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      relay.register({
        url: 'https://example.com/webhook',
        secret: 'my-webhook-secret',
      });

      await relay.dispatch(createMockEvent('dispute.created'));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Webhook-Signature': expect.stringMatching(/^sha256=[a-f0-9]{64}$/),
          }),
        })
      );
    });

    it('should not include signature header when no secret', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      relay.register({ url: 'https://example.com/webhook' });

      await relay.dispatch(createMockEvent('dispute.created'));

      const call = mockFetch.mock.calls[0];
      expect(call[1].headers['X-Webhook-Signature']).toBeUndefined();
    });
  });

  describe('Delivery History', () => {
    it('should record successful delivery', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      relay.register({ url: 'https://example.com/webhook' });
      const event = createMockEvent('dispute.created');
      await relay.dispatch(event);

      const history = relay.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(true);
      expect(history[0].statusCode).toBe(200);
      expect(history[0].eventId).toBe(event.eventId);
    });

    it('should record failed delivery', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      relay.register({ url: 'https://example.com/webhook' });
      await relay.dispatch(createMockEvent('dispute.created'));

      const history = relay.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(false);
      expect(history[0].error).toBe('Connection refused');
    });

    it('should filter history by subscription', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const sub1 = relay.register({ url: 'https://example1.com/webhook' });
      const sub2 = relay.register({ url: 'https://example2.com/webhook' });

      await relay.dispatch(createMockEvent('dispute.created'));
      await relay.dispatch(createMockEvent('dispute.resolved'));

      const fullHistory = relay.getHistory();
      expect(fullHistory).toHaveLength(4); // 2 events x 2 subscriptions

      const sub1History = relay.getHistory({ subscriptionId: sub1.id });
      expect(sub1History).toHaveLength(2);
    });

    it('should filter history by success status', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockRejectedValueOnce(new Error('Failed'));

      relay.register({ url: 'https://example.com/webhook' });
      await relay.dispatch(createMockEvent('dispute.created'));
      await relay.dispatch(createMockEvent('dispute.resolved'));

      const successOnly = relay.getHistory({ successOnly: true });
      expect(successOnly).toHaveLength(1);
      expect(successOnly[0].success).toBe(true);
    });

    it('should clear history', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      relay.register({ url: 'https://example.com/webhook' });
      await relay.dispatch(createMockEvent('dispute.created'));

      expect(relay.getHistory()).toHaveLength(1);

      relay.clearHistory();
      expect(relay.getHistory()).toHaveLength(0);
    });
  });
});

// ============ Signature Verification Tests ============

describe('verifyWebhookSignature', () => {
  const secret = 'test-secret-key';
  const payload = '{"type":"dispute.created","data":{}}';

  it('should verify valid signature', () => {
    const { createHmac } = require('crypto');
    const expectedHmac = createHmac('sha256', secret).update(payload).digest('hex');
    const signature = `sha256=${expectedHmac}`;

    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  it('should reject invalid signature', () => {
    const signature = 'sha256=invalidhexstring00000000000000000000000000000000000000000000';
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(false);
  });

  it('should reject signature with wrong length', () => {
    const signature = 'sha256=tooshort';
    expect(verifyWebhookSignature(payload, signature, secret)).toBe(false);
  });

  it('should reject signature with wrong secret', () => {
    const { createHmac } = require('crypto');
    const wrongSecretHmac = createHmac('sha256', 'wrong-secret').update(payload).digest('hex');
    const signature = `sha256=${wrongSecretHmac}`;

    expect(verifyWebhookSignature(payload, signature, secret)).toBe(false);
  });

  it('should handle different payloads', () => {
    const { createHmac } = require('crypto');
    const payload1 = '{"a":1}';
    const payload2 = '{"a":2}';
    
    const sig1 = `sha256=${createHmac('sha256', secret).update(payload1).digest('hex')}`;
    
    expect(verifyWebhookSignature(payload1, sig1, secret)).toBe(true);
    expect(verifyWebhookSignature(payload2, sig1, secret)).toBe(false);
  });
});

// ============ Webhook Types Tests ============

describe('Webhook Types', () => {
  it('should have all required fields for dispute.created', () => {
    const event = createMockEvent('dispute.created') as DisputeCreatedEvent;
    
    expect(event.type).toBe('dispute.created');
    expect(event.eventId).toBeDefined();
    expect(event.timestamp).toBeGreaterThan(0);
    expect(event.chainId).toBe(8453);
    expect(event.data.disputeId).toBeDefined();
    expect(event.data.claimant).toBeDefined();
    expect(event.data.respondent).toBeDefined();
    expect(event.data.amount).toBeDefined();
    expect(event.data.evidenceURI).toBeDefined();
    expect(event.data.votingDeadline).toBeDefined();
  });

  it('should have all required fields for escrow.created', () => {
    const event = createMockEvent('escrow.created') as EscrowCreatedEvent;
    
    expect(event.type).toBe('escrow.created');
    expect(event.data.transactionId).toBeDefined();
    expect(event.data.payer).toBeDefined();
    expect(event.data.payee).toBeDefined();
    expect(event.data.token).toBeDefined();
    expect(event.data.amount).toBeDefined();
    expect(event.data.description).toBeDefined();
    expect(event.data.deadline).toBeDefined();
  });

  it('should serialize bigints correctly in payload', async () => {
    const event = createMockEvent('dispute.created', {
      disputeId: 12345678901234567890n,
      amount: 999999999999999999999n,
    }) as DisputeCreatedEvent;

    // Simulate JSON serialization (what relay does)
    const serialized = JSON.stringify(event, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
    const parsed = JSON.parse(serialized);

    expect(parsed.data.disputeId).toBe('12345678901234567890');
    expect(parsed.data.amount).toBe('999999999999999999999');
  });
});
