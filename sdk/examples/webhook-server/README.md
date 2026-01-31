# Webhook Server Example

Monitor dispute events and forward them to your webhook endpoints.

## Overview

This example shows how to:
1. **Poll the chain** for dispute events (new disputes, votes, resolutions)
2. **Forward events** to registered webhook URLs
3. **Verify signatures** in your webhook handler

## Quick Start

```bash
cd examples/webhook-server
npm install
npx tsx run.ts
```

## Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Base Chain    │       │   WebhookPoller │       │   Your Agent    │
│                 │──────▶│     + Relay     │──────▶│  Webhook URL    │
│  KaraDispute    │       │                 │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘
      Events              Poll & Forward              POST events
```

## Components

### WebhookPoller
Polls the chain at regular intervals to detect dispute state changes:
- New disputes created
- Voting started
- Votes cast
- Disputes resolved
- Disputes appealed

### WebhookRelay
Forwards events to registered webhook URLs:
- Event filtering (by type, address, dispute ID)
- HMAC signature for verification
- Automatic retries with exponential backoff
- Delivery history tracking

## Usage

### 1. Start the Poller

```typescript
import { WebhookPoller, WebhookRelay } from '@kara/dispute-sdk';

const poller = new WebhookPoller({
  chain: 'base',
  pollIntervalMs: 30_000, // Check every 30 seconds
  disputeIds: [1n, 2n],   // Monitor specific disputes
});

const relay = new WebhookRelay({
  maxRetries: 3,
  timeoutMs: 10_000,
});

// Connect poller to relay
poller.onAll((event) => relay.dispatch(event));

poller.start();
```

### 2. Register Webhooks

```typescript
// Register your agent's webhook URL
relay.register({
  url: 'https://my-agent.example.com/webhooks/karadispute',
  events: ['dispute.resolved', 'dispute.appealed'],
  secret: process.env.WEBHOOK_SECRET,
});

// Register another webhook for all events
relay.register({
  url: 'https://backup.example.com/events',
  events: [], // Empty = all events
});
```

### 3. Handle Webhooks (in your agent)

```typescript
import { verifyWebhookSignature } from '@kara/dispute-sdk';

app.post('/webhooks/karadispute', (req, res) => {
  const payload = JSON.stringify(req.body);
  const signature = req.headers['x-webhook-signature'];
  
  // Verify signature
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Handle event
  const event = req.body;
  
  switch (event.type) {
    case 'dispute.resolved':
      console.log(`Dispute ${event.data.disputeId} resolved: ${event.data.rulingText}`);
      break;
    case 'dispute.vote_cast':
      console.log(`Vote cast on dispute ${event.data.disputeId}`);
      break;
  }
  
  res.status(200).send('OK');
});
```

## Event Types

| Event | Description |
|-------|-------------|
| `dispute.created` | New dispute created |
| `dispute.voting_started` | Voting period began |
| `dispute.vote_cast` | Arbitrator voted |
| `dispute.resolved` | Dispute resolved with ruling |
| `dispute.appealed` | Dispute was appealed |
| `escrow.created` | New escrow created |
| `escrow.disputed` | Escrow was disputed |
| `escrow.released` | Escrow funds released |

## Webhook Payload

```json
{
  "type": "dispute.resolved",
  "eventId": "uuid",
  "timestamp": 1706745600,
  "chainId": 8453,
  "data": {
    "disputeId": "1",
    "ruling": 1,
    "rulingText": "claimant",
    "finalVotes": {
      "forClaimant": "3",
      "forRespondent": "1",
      "abstained": "0"
    }
  }
}
```

## Headers

| Header | Description |
|--------|-------------|
| `X-Webhook-Event` | Event type |
| `X-Webhook-Delivery` | Unique delivery ID |
| `X-Webhook-Timestamp` | Event timestamp |
| `X-Webhook-Signature` | HMAC-SHA256 signature |

## Files

- `run.ts` - Main example: poller + relay + mock handler
- `verify.ts` - Signature verification example
