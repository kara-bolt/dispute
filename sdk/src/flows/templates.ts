/**
 * Pre-built dispute templates for common scenarios
 * @module @kara/dispute-sdk/flows
 */

import type { Address } from 'viem';

// ============ Dispute Reason Templates ============

export type DisputeReason = 
  | 'service_not_delivered'
  | 'quality_issues'
  | 'partial_delivery'
  | 'deadline_missed'
  | 'scope_dispute'
  | 'payment_dispute'
  | 'fraud'
  | 'other';

export interface DisputeTemplate {
  reason: DisputeReason;
  title: string;
  description: string;
  suggestedDeadlineHours: number;
  evidenceFields: string[];
}

export const DISPUTE_TEMPLATES: Record<DisputeReason, DisputeTemplate> = {
  service_not_delivered: {
    reason: 'service_not_delivered',
    title: 'Service Not Delivered',
    description: 'The agreed-upon service or deliverable was not provided by the deadline.',
    suggestedDeadlineHours: 72,
    evidenceFields: ['originalAgreement', 'deadline', 'communicationLog', 'paymentProof'],
  },
  
  quality_issues: {
    reason: 'quality_issues',
    title: 'Quality Below Agreement',
    description: 'The delivered work does not meet the quality standards specified in the agreement.',
    suggestedDeadlineHours: 48,
    evidenceFields: ['originalAgreement', 'deliveredWork', 'qualityComparison', 'specificIssues'],
  },
  
  partial_delivery: {
    reason: 'partial_delivery',
    title: 'Partial Delivery',
    description: 'Only a portion of the agreed work was delivered.',
    suggestedDeadlineHours: 48,
    evidenceFields: ['originalAgreement', 'deliveredItems', 'missingItems', 'completionPercentage'],
  },
  
  deadline_missed: {
    reason: 'deadline_missed',
    title: 'Deadline Missed',
    description: 'The work was not delivered by the agreed deadline.',
    suggestedDeadlineHours: 24,
    evidenceFields: ['originalAgreement', 'agreedDeadline', 'actualDeliveryDate', 'communicationLog'],
  },
  
  scope_dispute: {
    reason: 'scope_dispute',
    title: 'Scope Disagreement',
    description: 'There is a disagreement about what was included in the original agreement.',
    suggestedDeadlineHours: 72,
    evidenceFields: ['originalAgreement', 'claimantInterpretation', 'respondentInterpretation', 'relevantMessages'],
  },
  
  payment_dispute: {
    reason: 'payment_dispute',
    title: 'Payment Dispute',
    description: 'Disagreement about payment terms, amounts, or completion.',
    suggestedDeadlineHours: 48,
    evidenceFields: ['originalAgreement', 'paymentTerms', 'workCompleted', 'paymentsMade'],
  },
  
  fraud: {
    reason: 'fraud',
    title: 'Fraudulent Activity',
    description: 'Intentional misrepresentation or fraudulent behavior detected.',
    suggestedDeadlineHours: 72,
    evidenceFields: ['fraudDescription', 'evidence', 'damageCaused', 'identityProof'],
  },
  
  other: {
    reason: 'other',
    title: 'Other Dispute',
    description: 'A dispute that does not fit standard categories.',
    suggestedDeadlineHours: 72,
    evidenceFields: ['description', 'evidence', 'requestedOutcome'],
  },
};

// ============ Evidence Builder ============

export interface Evidence {
  type: DisputeReason;
  title: string;
  description: string;
  timestamp: number;
  claimant: Address;
  respondent: Address;
  amount: string;
  details: Record<string, unknown>;
  attachments?: string[];
}

export function buildEvidence(params: {
  type: DisputeReason;
  claimant: Address;
  respondent: Address;
  amount: bigint;
  description: string;
  details?: Record<string, unknown>;
  attachments?: string[];
}): Evidence {
  const template = DISPUTE_TEMPLATES[params.type];
  
  return {
    type: params.type,
    title: template.title,
    description: params.description || template.description,
    timestamp: Math.floor(Date.now() / 1000),
    claimant: params.claimant,
    respondent: params.respondent,
    amount: params.amount.toString(),
    details: params.details || {},
    attachments: params.attachments,
  };
}

// ============ Quick Evidence Builders ============

export const QuickEvidence = {
  /**
   * Service provider didn't deliver
   */
  serviceNotDelivered(params: {
    claimant: Address;
    respondent: Address;
    amount: bigint;
    serviceDescription: string;
    deadline: Date;
    paymentTxHash?: string;
  }): Evidence {
    return buildEvidence({
      type: 'service_not_delivered',
      claimant: params.claimant,
      respondent: params.respondent,
      amount: params.amount,
      description: `Service "${params.serviceDescription}" was not delivered by ${params.deadline.toISOString()}`,
      details: {
        serviceDescription: params.serviceDescription,
        agreedDeadline: params.deadline.toISOString(),
        paymentTxHash: params.paymentTxHash,
      },
    });
  },

  /**
   * Quality issues with delivered work
   */
  qualityIssues(params: {
    claimant: Address;
    respondent: Address;
    amount: bigint;
    issues: string[];
    deliveredWorkHash?: string;
  }): Evidence {
    return buildEvidence({
      type: 'quality_issues',
      claimant: params.claimant,
      respondent: params.respondent,
      amount: params.amount,
      description: `Delivered work has quality issues: ${params.issues.join(', ')}`,
      details: {
        issues: params.issues,
        deliveredWorkHash: params.deliveredWorkHash,
      },
    });
  },

  /**
   * Partial delivery
   */
  partialDelivery(params: {
    claimant: Address;
    respondent: Address;
    amount: bigint;
    deliveredPercentage: number;
    missingItems: string[];
  }): Evidence {
    return buildEvidence({
      type: 'partial_delivery',
      claimant: params.claimant,
      respondent: params.respondent,
      amount: params.amount,
      description: `Only ${params.deliveredPercentage}% of work delivered. Missing: ${params.missingItems.join(', ')}`,
      details: {
        deliveredPercentage: params.deliveredPercentage,
        missingItems: params.missingItems,
      },
    });
  },

  /**
   * Custom dispute
   */
  custom(params: {
    claimant: Address;
    respondent: Address;
    amount: bigint;
    title: string;
    description: string;
    details?: Record<string, unknown>;
  }): Evidence {
    return {
      type: 'other',
      title: params.title,
      description: params.description,
      timestamp: Math.floor(Date.now() / 1000),
      claimant: params.claimant,
      respondent: params.respondent,
      amount: params.amount.toString(),
      details: params.details || {},
    };
  },
};
