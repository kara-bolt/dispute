/**
 * KaraDispute Flows - Simplified patterns for AI agents
 * @module @kara/dispute-sdk/flows
 */

export { DisputeFlow } from './dispute-flow';
export type {
  DisputeFlowConfig,
  SimpleDisputeParams,
  SimpleEscrowDisputeParams,
  DisputeResult,
  EscrowDisputeResult,
  FlowStatus,
} from './dispute-flow';

export {
  DISPUTE_TEMPLATES,
  QuickEvidence,
  buildEvidence,
} from './templates';
export type {
  DisputeReason,
  DisputeTemplate,
  Evidence,
} from './templates';
