/**
 * Webhook Signature Verification Example
 * 
 * Shows how to verify webhook signatures in your handler.
 * 
 * Run: npx tsx verify.ts
 */

import { verifyWebhookSignature } from '@kara/dispute-sdk';
import { createHmac } from 'crypto';

// Example payload (as you'd receive it)
const examplePayload = JSON.stringify({
  type: 'dispute.resolved',
  eventId: '123e4567-e89b-12d3-a456-426614174000',
  timestamp: 1706745600,
  chainId: 8453,
  data: {
    disputeId: '1',
    ruling: 1,
    rulingText: 'claimant',
    finalVotes: {
      forClaimant: '3',
      forRespondent: '1',
      abstained: '0',
    },
  },
});

const secret = 'my-webhook-secret';

// Generate signature (this is what the relay does)
function signPayload(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

const validSignature = signPayload(examplePayload, secret);
const invalidSignature = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  Webhook Signature Verification Demo                      ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log('');

console.log('Payload:');
console.log(examplePayload.slice(0, 100) + '...');
console.log('');

console.log('Secret:', secret);
console.log('');

console.log('Valid Signature:', validSignature.slice(0, 30) + '...');
console.log('');

// Test verification
console.log('Testing verifyWebhookSignature():');
console.log('');

const isValid = verifyWebhookSignature(examplePayload, validSignature, secret);
console.log(`  Valid signature:   ${isValid ? '✅ VERIFIED' : '❌ FAILED'}`);

const isInvalid = verifyWebhookSignature(examplePayload, invalidSignature, secret);
console.log(`  Invalid signature: ${isInvalid ? '✅ VERIFIED' : '❌ REJECTED'}`);

console.log('');
console.log('Example handler code:');
console.log('');
console.log(`
app.post('/webhook', (req, res) => {
  const payload = JSON.stringify(req.body);
  const signature = req.headers['x-webhook-signature'];
  
  if (!verifyWebhookSignature(payload, signature, process.env.SECRET)) {
    return res.status(401).send('Unauthorized');
  }
  
  // Handle verified event
  const event = req.body;
  console.log(\`Received: \${event.type}\`);
  
  res.status(200).send('OK');
});
`);
