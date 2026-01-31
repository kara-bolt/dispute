/**
 * Webhook Server Example
 * 
 * Demonstrates how to poll for dispute events and forward them to webhooks.
 * 
 * Run: npx tsx run.ts
 */

import { WebhookPoller, WebhookRelay, verifyWebhookSignature } from '@kara/dispute-sdk';
import { createServer, IncomingMessage, ServerResponse } from 'http';

// ============ Configuration ============

const CONFIG = {
  chain: 'base-sepolia' as const,
  pollIntervalMs: 15_000, // 15 seconds for demo
  webhookPort: 3456,
  webhookSecret: 'demo-secret-change-in-production',
};

// ============ Mock Webhook Server ============

function startMockWebhookServer(): void {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST' || req.url !== '/webhook') {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    // Read body
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const payload = Buffer.concat(chunks).toString();

    // Get signature
    const signature = req.headers['x-webhook-signature'] as string;

    // Verify signature
    if (!verifyWebhookSignature(payload, signature, CONFIG.webhookSecret)) {
      console.log('❌ Invalid webhook signature!');
      res.writeHead(401);
      res.end('Unauthorized');
      return;
    }

    // Parse event
    const event = JSON.parse(payload);
    
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  📬 WEBHOOK RECEIVED                              ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Type:      ${event.type}`);
    console.log(`Event ID:  ${event.eventId}`);
    console.log(`Chain ID:  ${event.chainId}`);
    console.log(`Timestamp: ${new Date(event.timestamp * 1000).toISOString()}`);
    console.log('');
    console.log('Data:');
    console.log(JSON.stringify(event.data, null, 2));
    console.log('');

    // Handle specific events
    switch (event.type) {
      case 'dispute.created':
        console.log(`🆕 New dispute #${event.data.disputeId} created!`);
        console.log(`   Claimant: ${event.data.claimant}`);
        console.log(`   Respondent: ${event.data.respondent}`);
        break;

      case 'dispute.voting_started':
        console.log(`🗳️  Voting started on dispute #${event.data.disputeId}`);
        console.log(`   Deadline: ${new Date(Number(event.data.votingDeadline) * 1000).toISOString()}`);
        break;

      case 'dispute.vote_cast':
        console.log(`✅ Vote cast on dispute #${event.data.disputeId}`);
        console.log(`   Current: ${event.data.currentVotes.forClaimant} for, ${event.data.currentVotes.forRespondent} against`);
        break;

      case 'dispute.resolved':
        console.log(`⚖️  Dispute #${event.data.disputeId} RESOLVED!`);
        console.log(`   Ruling: ${event.data.rulingText.toUpperCase()} wins`);
        console.log(`   Final votes: ${event.data.finalVotes.forClaimant}-${event.data.finalVotes.forRespondent}`);
        break;

      case 'dispute.appealed':
        console.log(`📢 Dispute #${event.data.disputeId} appealed!`);
        console.log(`   Round: ${event.data.appealRound}`);
        break;

      default:
        console.log(`📋 Received ${event.type}`);
    }

    res.writeHead(200);
    res.end('OK');
  });

  server.listen(CONFIG.webhookPort, () => {
    console.log(`🌐 Mock webhook server listening on http://localhost:${CONFIG.webhookPort}/webhook`);
  });
}

// ============ Main ============

async function main(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  KaraDispute Webhook Server Demo                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  // Start mock webhook server
  startMockWebhookServer();

  // Create the poller
  console.log(`📡 Creating poller for ${CONFIG.chain}...`);
  const poller = new WebhookPoller({
    chain: CONFIG.chain,
    pollIntervalMs: CONFIG.pollIntervalMs,
    // Add dispute IDs to monitor:
    // disputeIds: [1n, 2n, 3n],
  });

  // Create the relay
  console.log('🔗 Creating webhook relay...');
  const relay = new WebhookRelay({
    maxRetries: 3,
    retryDelayMs: 1000,
    timeoutMs: 5000,
    storeHistory: true,
  });

  // Register our mock webhook
  const subscription = relay.register({
    url: `http://localhost:${CONFIG.webhookPort}/webhook`,
    events: [], // All events
    secret: CONFIG.webhookSecret,
  });
  console.log(`✅ Registered webhook: ${subscription.id}`);

  // Connect poller to relay
  poller.onAll((event) => {
    console.log(`📤 Dispatching ${event.type}...`);
    relay.dispatch(event);
  });

  // Also log events directly for debugging
  poller.on('dispute.created', (event) => {
    console.log(`🎯 [Direct Handler] Dispute ${event.data.disputeId} created`);
  });

  poller.on('dispute.resolved', (event) => {
    console.log(`🎯 [Direct Handler] Dispute ${event.data.disputeId} resolved: ${event.data.rulingText}`);
  });

  // Start polling
  console.log('');
  console.log(`⏱️  Starting poller (every ${CONFIG.pollIntervalMs / 1000}s)...`);
  console.log('');
  console.log('Monitoring for dispute events...');
  console.log('Add disputes to watch: poller.addDispute(1n)');
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');

  await poller.start();

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...');
    poller.stop();

    // Print delivery history
    const history = relay.getHistory({ limit: 10 });
    if (history.length > 0) {
      console.log('\n📊 Delivery History:');
      history.forEach(d => {
        const status = d.success ? '✅' : '❌';
        console.log(`  ${status} ${d.eventId.slice(0, 8)}... → ${d.statusCode || 'timeout'} (attempt ${d.attempt})`);
      });
    }

    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
