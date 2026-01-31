import {
  BASE_MAINNET_ADDRESSES,
  BASE_SEPOLIA_ADDRESSES,
  BASIS_POINTS,
  DEFAULT_ESCROW_DEADLINE,
  DEFAULT_MIN_VOTES,
  DEFAULT_VOTING_PERIOD,
  DisputeStatus,
  KARA_TIERS,
  KARA_TOKEN_ADDRESS,
  KaraDispute,
  KaraDisputeWriter,
  MIN_ARBITRATOR_STAKE,
  Ruling,
  TransactionStatus,
  erc20Abi,
  getAddresses,
  karaDisputeV2Abi,
  karaEscrowAbi,
  karaPayV2Abi
} from "./chunk-M7IJODBS.mjs";

// src/flows/dispute-flow.ts
import {
  createWalletClient,
  http,
  parseEther,
  formatEther
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

// src/flows/templates.ts
var DISPUTE_TEMPLATES = {
  service_not_delivered: {
    reason: "service_not_delivered",
    title: "Service Not Delivered",
    description: "The agreed-upon service or deliverable was not provided by the deadline.",
    suggestedDeadlineHours: 72,
    evidenceFields: ["originalAgreement", "deadline", "communicationLog", "paymentProof"]
  },
  quality_issues: {
    reason: "quality_issues",
    title: "Quality Below Agreement",
    description: "The delivered work does not meet the quality standards specified in the agreement.",
    suggestedDeadlineHours: 48,
    evidenceFields: ["originalAgreement", "deliveredWork", "qualityComparison", "specificIssues"]
  },
  partial_delivery: {
    reason: "partial_delivery",
    title: "Partial Delivery",
    description: "Only a portion of the agreed work was delivered.",
    suggestedDeadlineHours: 48,
    evidenceFields: ["originalAgreement", "deliveredItems", "missingItems", "completionPercentage"]
  },
  deadline_missed: {
    reason: "deadline_missed",
    title: "Deadline Missed",
    description: "The work was not delivered by the agreed deadline.",
    suggestedDeadlineHours: 24,
    evidenceFields: ["originalAgreement", "agreedDeadline", "actualDeliveryDate", "communicationLog"]
  },
  scope_dispute: {
    reason: "scope_dispute",
    title: "Scope Disagreement",
    description: "There is a disagreement about what was included in the original agreement.",
    suggestedDeadlineHours: 72,
    evidenceFields: ["originalAgreement", "claimantInterpretation", "respondentInterpretation", "relevantMessages"]
  },
  payment_dispute: {
    reason: "payment_dispute",
    title: "Payment Dispute",
    description: "Disagreement about payment terms, amounts, or completion.",
    suggestedDeadlineHours: 48,
    evidenceFields: ["originalAgreement", "paymentTerms", "workCompleted", "paymentsMade"]
  },
  fraud: {
    reason: "fraud",
    title: "Fraudulent Activity",
    description: "Intentional misrepresentation or fraudulent behavior detected.",
    suggestedDeadlineHours: 72,
    evidenceFields: ["fraudDescription", "evidence", "damageCaused", "identityProof"]
  },
  other: {
    reason: "other",
    title: "Other Dispute",
    description: "A dispute that does not fit standard categories.",
    suggestedDeadlineHours: 72,
    evidenceFields: ["description", "evidence", "requestedOutcome"]
  }
};
function buildEvidence(params) {
  const template = DISPUTE_TEMPLATES[params.type];
  return {
    type: params.type,
    title: template.title,
    description: params.description || template.description,
    timestamp: Math.floor(Date.now() / 1e3),
    claimant: params.claimant,
    respondent: params.respondent,
    amount: params.amount.toString(),
    details: params.details || {},
    attachments: params.attachments
  };
}
var QuickEvidence = {
  /**
   * Service provider didn't deliver
   */
  serviceNotDelivered(params) {
    return buildEvidence({
      type: "service_not_delivered",
      claimant: params.claimant,
      respondent: params.respondent,
      amount: params.amount,
      description: `Service "${params.serviceDescription}" was not delivered by ${params.deadline.toISOString()}`,
      details: {
        serviceDescription: params.serviceDescription,
        agreedDeadline: params.deadline.toISOString(),
        paymentTxHash: params.paymentTxHash
      }
    });
  },
  /**
   * Quality issues with delivered work
   */
  qualityIssues(params) {
    return buildEvidence({
      type: "quality_issues",
      claimant: params.claimant,
      respondent: params.respondent,
      amount: params.amount,
      description: `Delivered work has quality issues: ${params.issues.join(", ")}`,
      details: {
        issues: params.issues,
        deliveredWorkHash: params.deliveredWorkHash
      }
    });
  },
  /**
   * Partial delivery
   */
  partialDelivery(params) {
    return buildEvidence({
      type: "partial_delivery",
      claimant: params.claimant,
      respondent: params.respondent,
      amount: params.amount,
      description: `Only ${params.deliveredPercentage}% of work delivered. Missing: ${params.missingItems.join(", ")}`,
      details: {
        deliveredPercentage: params.deliveredPercentage,
        missingItems: params.missingItems
      }
    });
  },
  /**
   * Custom dispute
   */
  custom(params) {
    return {
      type: "other",
      title: params.title,
      description: params.description,
      timestamp: Math.floor(Date.now() / 1e3),
      claimant: params.claimant,
      respondent: params.respondent,
      amount: params.amount.toString(),
      details: params.details || {}
    };
  }
};

// src/flows/dispute-flow.ts
var DisputeFlow = class {
  client;
  writer;
  autoApproveKara;
  constructor(config) {
    this.client = new KaraDispute({
      chain: config.chain,
      rpcUrl: config.rpcUrl
    });
    this.autoApproveKara = config.autoApproveKara ?? true;
    if (config.wallet) {
      this.writer = this.client.withWallet(config.wallet);
    } else if (config.privateKey) {
      const chain = config.chain === "base" ? base : baseSepolia;
      const wallet = createWalletClient({
        account: privateKeyToAccount(config.privateKey),
        chain,
        transport: http(config.rpcUrl)
      });
      this.writer = this.client.withWallet(wallet);
    }
  }
  /**
   * Get the wallet address
   */
  get address() {
    return this.writer?.walletClient.account?.address;
  }
  /**
   * Check if write operations are available
   */
  get canWrite() {
    return !!this.writer;
  }
  // ============ One-Liner Dispute Creation ============
  /**
   * Create a dispute with minimal params
   * 
   * @example
   * ```typescript
   * const { disputeId } = await flow.createDispute({
   *   against: '0xBadActor...',
   *   amount: parseEther('0.5'),
   *   reason: 'service_not_delivered',
   *   description: 'Did not complete task by deadline',
   * });
   * ```
   */
  async createDispute(params) {
    if (!this.writer) {
      throw new Error("Wallet required for createDispute. Pass wallet or privateKey to constructor.");
    }
    const myAddress = this.writer.walletClient.account.address;
    const template = DISPUTE_TEMPLATES[params.reason];
    const evidence = buildEvidence({
      type: params.reason,
      claimant: myAddress,
      respondent: params.against,
      amount: params.amount,
      description: params.description || template.description,
      details: params.details
    });
    const evidenceUri = this.createEvidenceUri(evidence);
    const result = await this.writer.agentCreateDispute({
      from: myAddress,
      counterparty: params.against,
      amount: params.amount,
      description: params.description || template.description,
      evidence: evidence.details
    });
    const dispute = await this.client.getDispute(result.disputeId);
    return {
      disputeId: result.disputeId,
      txHash: result.hash,
      evidenceUri,
      votingDeadline: new Date(Number(dispute.votingDeadline) * 1e3),
      dispute
    };
  }
  /**
   * Dispute an existing escrow transaction
   * 
   * @example
   * ```typescript
   * const { disputeId } = await flow.disputeEscrow({
   *   escrowId: 123n,
   *   reason: 'quality_issues',
   *   description: 'Code has critical bugs',
   * });
   * ```
   */
  async disputeEscrow(params) {
    if (!this.writer) {
      throw new Error("Wallet required for disputeEscrow. Pass wallet or privateKey to constructor.");
    }
    const escrow = await this.client.getEscrowTransaction(params.escrowId);
    if (!escrow) {
      throw new Error(`Escrow ${params.escrowId} not found`);
    }
    const myAddress = this.writer.walletClient.account.address;
    const template = DISPUTE_TEMPLATES[params.reason];
    const evidence = buildEvidence({
      type: params.reason,
      claimant: myAddress,
      respondent: myAddress === escrow.payer ? escrow.payee : escrow.payer,
      amount: escrow.amount,
      description: params.description || template.description,
      details: {
        escrowId: params.escrowId.toString(),
        ...params.details
      }
    });
    const evidenceUri = this.createEvidenceUri(evidence);
    const result = await this.writer.raiseDispute({
      transactionId: params.escrowId,
      evidenceURI: evidenceUri
    });
    const dispute = await this.client.getDispute(result.disputeId);
    return {
      disputeId: result.disputeId,
      txHash: result.hash,
      evidenceUri,
      votingDeadline: new Date(Number(dispute.votingDeadline) * 1e3),
      dispute,
      escrow
    };
  }
  // ============ Quick Dispute Methods ============
  /**
   * Quick dispute: Service not delivered
   */
  async disputeServiceNotDelivered(params) {
    const evidence = QuickEvidence.serviceNotDelivered({
      claimant: this.address,
      respondent: params.against,
      amount: params.amount,
      serviceDescription: params.serviceDescription,
      deadline: params.deadline,
      paymentTxHash: params.paymentTxHash
    });
    return this.createDispute({
      against: params.against,
      amount: params.amount,
      reason: "service_not_delivered",
      description: evidence.description,
      details: evidence.details
    });
  }
  /**
   * Quick dispute: Quality issues
   */
  async disputeQualityIssues(params) {
    const evidence = QuickEvidence.qualityIssues({
      claimant: this.address,
      respondent: params.against,
      amount: params.amount,
      issues: params.issues,
      deliveredWorkHash: params.deliveredWorkHash
    });
    return this.createDispute({
      against: params.against,
      amount: params.amount,
      reason: "quality_issues",
      description: evidence.description,
      details: evidence.details
    });
  }
  /**
   * Quick dispute: Partial delivery
   */
  async disputePartialDelivery(params) {
    const evidence = QuickEvidence.partialDelivery({
      claimant: this.address,
      respondent: params.against,
      amount: params.amount,
      deliveredPercentage: params.deliveredPercentage,
      missingItems: params.missingItems
    });
    return this.createDispute({
      against: params.against,
      amount: params.amount,
      reason: "partial_delivery",
      description: evidence.description,
      details: evidence.details
    });
  }
  // ============ Status & Monitoring ============
  /**
   * Get dispute status with human-readable info
   */
  async getStatus(disputeId) {
    const dispute = await this.client.getDispute(disputeId);
    const votes = await this.client.getVoteResult(disputeId);
    const now = Math.floor(Date.now() / 1e3);
    const deadline = Number(dispute.votingDeadline);
    const votingTimeRemaining = Math.max(0, deadline - now);
    const statusMap = {
      0: "None",
      1: "Open",
      2: "Voting",
      3: "Resolved",
      4: "Appealed"
    };
    const rulingMap = {
      0: "refused",
      1: "claimant",
      2: "respondent"
    };
    return {
      status: dispute.status,
      statusText: statusMap[dispute.status] || "Unknown",
      votingOpen: dispute.status === 2 && votingTimeRemaining > 0,
      votingTimeRemaining,
      votes: {
        forClaimant: votes.forClaimant,
        forRespondent: votes.forRespondent,
        abstained: votes.abstained
      },
      ruling: dispute.status === 3 ? rulingMap[dispute.ruling] : void 0
    };
  }
  /**
   * Wait for dispute resolution
   */
  async waitForResolution(disputeId, options) {
    const pollInterval = options?.pollIntervalMs || 3e4;
    const timeout = options?.timeoutMs || 7 * 24 * 60 * 60 * 1e3;
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const status = await this.getStatus(disputeId);
      if (status.status === 3 || status.status === 4) {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
    throw new Error(`Timeout waiting for dispute ${disputeId} resolution`);
  }
  // ============ Utilities ============
  /**
   * Create evidence URI from evidence object
   * Uses data URL for simplicity - production should use IPFS
   */
  createEvidenceUri(evidence) {
    const json = JSON.stringify(evidence);
    const base64 = Buffer.from(json).toString("base64");
    return `data:application/json;base64,${base64}`;
  }
  /**
   * Get available dispute templates
   */
  static getTemplates() {
    return DISPUTE_TEMPLATES;
  }
  /**
   * Format amount for display
   */
  static formatAmount(wei) {
    return formatEther(wei);
  }
  /**
   * Parse ETH amount to wei
   */
  static parseAmount(eth) {
    return parseEther(eth);
  }
};

// src/webhooks/poller.ts
import { parseAbiItem } from "viem";
import { base as base2, baseSepolia as baseSepolia2 } from "viem/chains";
import { randomUUID } from "crypto";
var DISPUTE_CREATED_EVENT = parseAbiItem(
  "event DisputeCreated(uint256 indexed disputeId, address indexed claimant, address indexed respondent, uint256 amount)"
);
var DISPUTE_RESOLVED_EVENT = parseAbiItem(
  "event DisputeResolved(uint256 indexed disputeId, uint8 ruling)"
);
var ESCROW_CREATED_EVENT = parseAbiItem(
  "event TransactionCreated(uint256 indexed transactionId, address indexed payer, address indexed payee, uint256 amount)"
);
var ESCROW_DISPUTED_EVENT = parseAbiItem(
  "event TransactionDisputed(uint256 indexed transactionId, uint256 indexed disputeId, address disputedBy)"
);
var ESCROW_RELEASED_EVENT = parseAbiItem(
  "event TransactionReleased(uint256 indexed transactionId, address releasedTo, uint256 amount)"
);
var WebhookPoller = class {
  client;
  publicClient;
  config;
  handlers = /* @__PURE__ */ new Map();
  disputeStates = /* @__PURE__ */ new Map();
  isRunning = false;
  pollTimer;
  lastBlockNumber = 0n;
  chainId;
  constructor(config) {
    this.config = {
      chain: config.chain,
      rpcUrl: config.rpcUrl ?? void 0,
      pollIntervalMs: config.pollIntervalMs ?? 3e4,
      disputeIds: config.disputeIds ?? [],
      addresses: config.addresses ?? [],
      fromBlock: config.fromBlock ?? 0n
    };
    this.client = new KaraDispute({
      chain: config.chain,
      rpcUrl: config.rpcUrl
    });
    const chain = config.chain === "base" ? base2 : baseSepolia2;
    this.chainId = chain.id;
    this.publicClient = this.client.publicClient;
    this.lastBlockNumber = this.config.fromBlock;
  }
  // ============ Event Subscription ============
  /**
   * Subscribe to a specific event type
   */
  on(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, /* @__PURE__ */ new Set());
    }
    this.handlers.get(eventType).add(handler);
    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }
  /**
   * Subscribe to all events
   */
  onAll(handler) {
    if (!this.handlers.has("*")) {
      this.handlers.set("*", /* @__PURE__ */ new Set());
    }
    this.handlers.get("*").add(handler);
    return () => {
      this.handlers.get("*")?.delete(handler);
    };
  }
  /**
   * Subscribe to multiple event types at once
   */
  subscribe(handlers) {
    const unsubscribers = [];
    for (const [eventType, handler] of Object.entries(handlers)) {
      if (handler) {
        if (eventType === "*") {
          unsubscribers.push(this.onAll(handler));
        } else {
          unsubscribers.push(this.on(eventType, handler));
        }
      }
    }
    return () => unsubscribers.forEach((unsub) => unsub());
  }
  // ============ Lifecycle ============
  /**
   * Start polling
   */
  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[WebhookPoller] Starting on ${this.config.chain}...`);
    await this.poll();
    this.pollTimer = setInterval(() => {
      this.poll().catch(console.error);
    }, this.config.pollIntervalMs);
  }
  /**
   * Stop polling
   */
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = void 0;
    }
    console.log("[WebhookPoller] Stopped");
  }
  /**
   * Check if running
   */
  get running() {
    return this.isRunning;
  }
  /**
   * Add a dispute to monitor
   */
  addDispute(disputeId) {
    if (!this.config.disputeIds.includes(disputeId)) {
      this.config.disputeIds.push(disputeId);
    }
  }
  /**
   * Remove a dispute from monitoring
   */
  removeDispute(disputeId) {
    const index = this.config.disputeIds.indexOf(disputeId);
    if (index > -1) {
      this.config.disputeIds.splice(index, 1);
      this.disputeStates.delete(disputeId.toString());
    }
  }
  // ============ Polling Logic ============
  async poll() {
    try {
      const currentBlock = await this.publicClient.getBlockNumber();
      await this.checkDisputeStates();
      this.lastBlockNumber = currentBlock;
    } catch (error) {
      console.error("[WebhookPoller] Poll error:", error);
    }
  }
  async checkDisputeStates() {
    const disputeIds = [...this.config.disputeIds];
    for (const disputeId of disputeIds) {
      try {
        const dispute = await this.client.getDispute(disputeId);
        const votes = await this.client.getVoteResult(disputeId);
        const key = disputeId.toString();
        const prevState = this.disputeStates.get(key);
        const newState = {
          status: dispute.status,
          votes: {
            forClaimant: votes.forClaimant,
            forRespondent: votes.forRespondent,
            abstained: votes.abstained
          },
          lastChecked: Date.now()
        };
        if (prevState) {
          if (newState.votes.forClaimant !== prevState.votes.forClaimant || newState.votes.forRespondent !== prevState.votes.forRespondent || newState.votes.abstained !== prevState.votes.abstained) {
            const voteEvent = {
              type: "dispute.vote_cast",
              eventId: randomUUID(),
              timestamp: Math.floor(Date.now() / 1e3),
              chainId: this.chainId,
              data: {
                disputeId,
                voter: "0x0000000000000000000000000000000000000000",
                // Unknown from polling
                vote: this.inferVoteType(prevState.votes, newState.votes),
                currentVotes: newState.votes
              }
            };
            this.emit(voteEvent);
          }
          if (newState.status !== prevState.status) {
            if (newState.status === 3 /* Resolved */) {
              const resolvedEvent = {
                type: "dispute.resolved",
                eventId: randomUUID(),
                timestamp: Math.floor(Date.now() / 1e3),
                chainId: this.chainId,
                data: {
                  disputeId,
                  ruling: dispute.ruling,
                  rulingText: this.rulingToText(dispute.ruling),
                  finalVotes: newState.votes
                }
              };
              this.emit(resolvedEvent);
            } else if (newState.status === 4 /* Appealed */) {
              this.emit({
                type: "dispute.appealed",
                eventId: randomUUID(),
                timestamp: Math.floor(Date.now() / 1e3),
                chainId: this.chainId,
                data: {
                  disputeId,
                  appellant: "0x0000000000000000000000000000000000000000",
                  appealRound: dispute.appealRound,
                  newVotingDeadline: dispute.votingDeadline
                }
              });
            } else if (newState.status === 2 /* Voting */ && prevState.status === 1 /* Open */) {
              this.emit({
                type: "dispute.voting_started",
                eventId: randomUUID(),
                timestamp: Math.floor(Date.now() / 1e3),
                chainId: this.chainId,
                data: {
                  disputeId,
                  votingDeadline: dispute.votingDeadline,
                  requiredVotes: dispute.requiredVotes
                }
              });
            }
          }
        } else {
          const createdEvent = {
            type: "dispute.created",
            eventId: randomUUID(),
            timestamp: Math.floor(Date.now() / 1e3),
            chainId: this.chainId,
            data: {
              disputeId,
              claimant: dispute.claimant,
              respondent: dispute.respondent,
              amount: dispute.amount,
              evidenceURI: dispute.evidenceURI,
              votingDeadline: dispute.votingDeadline
            }
          };
          this.emit(createdEvent);
        }
        this.disputeStates.set(key, newState);
      } catch (error) {
        console.error(`[WebhookPoller] Error checking dispute ${disputeId}:`, error);
      }
    }
  }
  inferVoteType(prev, next) {
    if (next.forClaimant > prev.forClaimant) return "claimant";
    if (next.forRespondent > prev.forRespondent) return "respondent";
    return "abstain";
  }
  rulingToText(ruling) {
    switch (ruling) {
      case 1 /* Claimant */:
        return "claimant";
      case 2 /* Respondent */:
        return "respondent";
      default:
        return "refused";
    }
  }
  emit(event) {
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
    const wildcardHandlers = this.handlers.get("*");
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
};

// src/webhooks/relay.ts
import { createHmac, randomUUID as randomUUID2 } from "crypto";
var WebhookRelay = class {
  subscriptions = /* @__PURE__ */ new Map();
  deliveryHistory = [];
  config;
  pendingDeliveries = /* @__PURE__ */ new Map();
  constructor(config = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1e3,
      timeoutMs: config.timeoutMs ?? 1e4,
      storeHistory: config.storeHistory ?? true,
      maxHistoryEntries: config.maxHistoryEntries ?? 1e3
    };
  }
  // ============ Subscription Management ============
  /**
   * Register a new webhook
   */
  register(params) {
    const subscription = {
      id: randomUUID2(),
      url: params.url,
      events: params.events ?? [],
      filterAddresses: params.filterAddresses,
      filterDisputeIds: params.filterDisputeIds,
      secret: params.secret,
      active: true,
      createdAt: Math.floor(Date.now() / 1e3)
    };
    this.subscriptions.set(subscription.id, subscription);
    console.log(`[WebhookRelay] Registered webhook: ${subscription.id} -> ${params.url}`);
    return subscription;
  }
  /**
   * Unregister a webhook
   */
  unregister(subscriptionId) {
    const deleted = this.subscriptions.delete(subscriptionId);
    if (deleted) {
      console.log(`[WebhookRelay] Unregistered webhook: ${subscriptionId}`);
    }
    return deleted;
  }
  /**
   * Get all subscriptions
   */
  getSubscriptions() {
    return Array.from(this.subscriptions.values());
  }
  /**
   * Get subscription by ID
   */
  getSubscription(id) {
    return this.subscriptions.get(id);
  }
  /**
   * Pause a subscription
   */
  pause(subscriptionId) {
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
  resume(subscriptionId) {
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
  async dispatch(event) {
    const matchingSubscriptions = this.findMatchingSubscriptions(event);
    const deliveries = matchingSubscriptions.map(
      (sub) => this.deliverToSubscription(sub, event)
    );
    await Promise.allSettled(deliveries);
  }
  findMatchingSubscriptions(event) {
    return Array.from(this.subscriptions.values()).filter((sub) => {
      if (!sub.active) return false;
      if (sub.events.length > 0 && !sub.events.includes(event.type)) {
        return false;
      }
      if (sub.filterAddresses && sub.filterAddresses.length > 0) {
        const eventAddresses = this.extractAddresses(event);
        const hasMatch = sub.filterAddresses.some(
          (addr) => eventAddresses.includes(addr.toLowerCase())
        );
        if (!hasMatch) return false;
      }
      if (sub.filterDisputeIds && sub.filterDisputeIds.length > 0) {
        const disputeId = this.extractDisputeId(event);
        if (disputeId && !sub.filterDisputeIds.includes(disputeId)) {
          return false;
        }
      }
      return true;
    });
  }
  extractAddresses(event) {
    const data = event.data;
    const addresses = [];
    if (data.claimant) addresses.push(data.claimant.toLowerCase());
    if (data.respondent) addresses.push(data.respondent.toLowerCase());
    if (data.payer) addresses.push(data.payer.toLowerCase());
    if (data.payee) addresses.push(data.payee.toLowerCase());
    if (data.voter) addresses.push(data.voter.toLowerCase());
    return addresses;
  }
  extractDisputeId(event) {
    const data = event.data;
    return data.disputeId;
  }
  async deliverToSubscription(subscription, event) {
    const deliveryId = randomUUID2();
    let attempt = 0;
    let success = false;
    let lastError;
    let statusCode;
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
    if (this.config.storeHistory) {
      const delivery = {
        deliveryId,
        eventId: event.eventId,
        subscriptionId: subscription.id,
        statusCode,
        success,
        error: lastError,
        attempt,
        timestamp: Math.floor(Date.now() / 1e3)
      };
      this.deliveryHistory.push(delivery);
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
  async sendWebhook(subscription, event, deliveryId) {
    const payload = JSON.stringify(
      event,
      (_, value) => typeof value === "bigint" ? value.toString() : value
    );
    const headers = {
      "Content-Type": "application/json",
      "X-Webhook-Event": event.type,
      "X-Webhook-Delivery": deliveryId,
      "X-Webhook-Timestamp": event.timestamp.toString()
    };
    if (subscription.secret) {
      const signature = this.signPayload(payload, subscription.secret);
      headers["X-Webhook-Signature"] = signature;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await fetch(subscription.url, {
        method: "POST",
        headers,
        body: payload,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  signPayload(payload, secret) {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    return `sha256=${hmac.digest("hex")}`;
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  // ============ History ============
  /**
   * Get delivery history
   */
  getHistory(options) {
    let history = [...this.deliveryHistory];
    if (options?.subscriptionId) {
      history = history.filter((d) => d.subscriptionId === options.subscriptionId);
    }
    if (options?.eventId) {
      history = history.filter((d) => d.eventId === options.eventId);
    }
    if (options?.successOnly !== void 0) {
      history = history.filter((d) => d.success === options.successOnly);
    }
    if (options?.limit) {
      history = history.slice(-options.limit);
    }
    return history;
  }
  /**
   * Clear delivery history
   */
  clearHistory() {
    this.deliveryHistory = [];
  }
};
function verifyWebhookSignature(payload, signature, secret) {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const expectedSignature = `sha256=${expected}`;
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return result === 0;
}
export {
  BASE_MAINNET_ADDRESSES,
  BASE_SEPOLIA_ADDRESSES,
  BASIS_POINTS,
  DEFAULT_ESCROW_DEADLINE,
  DEFAULT_MIN_VOTES,
  DEFAULT_VOTING_PERIOD,
  DISPUTE_TEMPLATES,
  DisputeFlow,
  DisputeStatus,
  KARA_TIERS,
  KARA_TOKEN_ADDRESS,
  KaraDispute,
  KaraDisputeWriter,
  MIN_ARBITRATOR_STAKE,
  QuickEvidence,
  Ruling,
  TransactionStatus,
  WebhookPoller,
  WebhookRelay,
  buildEvidence,
  erc20Abi,
  getAddresses,
  karaDisputeV2Abi,
  karaEscrowAbi,
  karaPayV2Abi,
  verifyWebhookSignature
};
