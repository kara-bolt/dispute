# Changelog

All notable changes to `@kara/dispute-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-02

### Added

#### Core SDK
- `KaraDispute` class - read-only client for querying disputes, escrows, and voting
- `KaraDisputeWriter` class - write operations with wallet integration
- Full TypeScript types for Dispute, EscrowTransaction, VoteResult, and more
- Contract ABIs exported for custom integrations

#### Agent-Friendly APIs
- `agentCreateEscrow()` - simplified escrow creation with sensible defaults
- `agentCreateDispute()` - one-liner dispute creation with evidence builder
- `DisputeFlow` class - high-level wrapper for common dispute patterns
- Pre-built templates for 8 dispute types (service not delivered, quality issues, etc.)

#### $KARA Token Integration
- Automatic holder discount detection (5-30% based on holdings)
- Auto-approval before KARA transactions
- Staking operations (stake/unstake)
- Tier-based discount system (TIER1-TIER4)

#### CLI Tool (`kara-dispute`)
- `get <id>` - fetch dispute details
- `escrow <id>` - fetch escrow transaction
- `votes <id>` - get voting status with distribution chart
- `balance <addr>` - check KARA balance and tier discount

#### Webhooks
- `WebhookPoller` - poll chain for dispute state changes
- `WebhookRelay` - forward events to registered webhook URLs
- HMAC-SHA256 signature verification
- Event filtering by type, address, or dispute ID
- Automatic retries with exponential backoff

#### Quick Evidence Helpers
- `QuickEvidence.serviceNotDelivered()` - pre-built evidence for non-delivery
- `QuickEvidence.qualityIssues()` - pre-built evidence for quality problems
- `QuickEvidence.partialDelivery()` - pre-built evidence for incomplete work
- `QuickEvidence.custom()` - flexible evidence builder

#### Documentation
- `README.md` - comprehensive usage guide
- `docs/API.md` - complete method reference
- `docs/INTEGRATION.md` - step-by-step integration guide
- `docs/EXAMPLES.md` - ready-to-use code samples
- `docs/QUICKSTART.md` - 5-minute onboarding guide

#### Examples
- `examples/agent-to-agent-payment/` - full agent payment workflow
- `examples/simple-dispute-flow/` - basic dispute creation
- `examples/webhook-server/` - webhook subscription demo

#### Test Coverage
- 156 tests across all modules
- Mocked blockchain interactions for offline testing
- Full coverage of webhooks, templates, DisputeFlow, and escrow operations

### Infrastructure
- ESM + CJS dual module output
- Full TypeScript type definitions
- vitest test framework

## [Unreleased]

### Pending
- KaraDispute contract deployment on Base (requires ~0.002 ETH)
- npm package publication

---

[0.1.0]: https://github.com/kara-bolt/dispute/releases/tag/v0.1.0
