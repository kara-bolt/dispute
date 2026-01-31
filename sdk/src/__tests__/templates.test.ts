/**
 * Tests for flows/templates module
 * Pure functions - no blockchain mocking needed
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DISPUTE_TEMPLATES,
  buildEvidence,
  QuickEvidence,
  type DisputeReason,
  type Evidence,
} from '../flows/templates';

describe('DISPUTE_TEMPLATES', () => {
  const allReasons: DisputeReason[] = [
    'service_not_delivered',
    'quality_issues',
    'partial_delivery',
    'deadline_missed',
    'scope_dispute',
    'payment_dispute',
    'fraud',
    'other',
  ];

  it('should have templates for all dispute reasons', () => {
    for (const reason of allReasons) {
      expect(DISPUTE_TEMPLATES[reason]).toBeDefined();
      expect(DISPUTE_TEMPLATES[reason].reason).toBe(reason);
    }
  });

  it('should have required fields for each template', () => {
    for (const reason of allReasons) {
      const template = DISPUTE_TEMPLATES[reason];
      expect(template.title).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.suggestedDeadlineHours).toBeGreaterThan(0);
      expect(Array.isArray(template.evidenceFields)).toBe(true);
      expect(template.evidenceFields.length).toBeGreaterThan(0);
    }
  });

  it('should have appropriate deadline hours', () => {
    // Fraud requires longer investigation
    expect(DISPUTE_TEMPLATES.fraud.suggestedDeadlineHours).toBe(72);
    // Deadline missed is time-sensitive
    expect(DISPUTE_TEMPLATES.deadline_missed.suggestedDeadlineHours).toBe(24);
  });

  it('should have relevant evidence fields for each type', () => {
    // Service not delivered should ask for agreement and deadline
    expect(DISPUTE_TEMPLATES.service_not_delivered.evidenceFields).toContain('originalAgreement');
    expect(DISPUTE_TEMPLATES.service_not_delivered.evidenceFields).toContain('deadline');

    // Quality issues should ask for delivered work
    expect(DISPUTE_TEMPLATES.quality_issues.evidenceFields).toContain('deliveredWork');
    expect(DISPUTE_TEMPLATES.quality_issues.evidenceFields).toContain('specificIssues');

    // Partial delivery should ask for completion percentage
    expect(DISPUTE_TEMPLATES.partial_delivery.evidenceFields).toContain('completionPercentage');
    expect(DISPUTE_TEMPLATES.partial_delivery.evidenceFields).toContain('missingItems');
  });
});

describe('buildEvidence', () => {
  const claimant = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const respondent = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
  const amount = 1000000000000000000n; // 1 ETH

  beforeEach(() => {
    // Mock Date.now for consistent timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-02T12:00:00Z'));
  });

  it('should build evidence with all required fields', () => {
    const evidence = buildEvidence({
      type: 'service_not_delivered',
      claimant,
      respondent,
      amount,
      description: 'Service was not provided',
    });

    expect(evidence.type).toBe('service_not_delivered');
    expect(evidence.claimant).toBe(claimant);
    expect(evidence.respondent).toBe(respondent);
    expect(evidence.amount).toBe(amount.toString());
    expect(evidence.description).toBe('Service was not provided');
    expect(evidence.title).toBe('Service Not Delivered');
    expect(evidence.timestamp).toBe(Math.floor(Date.now() / 1000));
  });

  it('should use template title', () => {
    const evidence = buildEvidence({
      type: 'quality_issues',
      claimant,
      respondent,
      amount,
      description: 'Code has bugs',
    });

    expect(evidence.title).toBe('Quality Below Agreement');
  });

  it('should include custom details', () => {
    const evidence = buildEvidence({
      type: 'partial_delivery',
      claimant,
      respondent,
      amount,
      description: 'Only half complete',
      details: {
        deliveredPercentage: 50,
        missingItems: ['docs', 'tests'],
      },
    });

    expect(evidence.details.deliveredPercentage).toBe(50);
    expect(evidence.details.missingItems).toEqual(['docs', 'tests']);
  });

  it('should include attachments when provided', () => {
    const evidence = buildEvidence({
      type: 'fraud',
      claimant,
      respondent,
      amount,
      description: 'Fake credentials',
      attachments: ['ipfs://Qm123', 'ipfs://Qm456'],
    });

    expect(evidence.attachments).toEqual(['ipfs://Qm123', 'ipfs://Qm456']);
  });

  it('should default to empty details object', () => {
    const evidence = buildEvidence({
      type: 'other',
      claimant,
      respondent,
      amount,
      description: 'Custom issue',
    });

    expect(evidence.details).toEqual({});
  });
});

describe('QuickEvidence', () => {
  const claimant = '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const respondent = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`;
  const amount = 500000000000000000n; // 0.5 ETH

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-02T12:00:00Z'));
  });

  describe('serviceNotDelivered', () => {
    it('should create service not delivered evidence', () => {
      const evidence = QuickEvidence.serviceNotDelivered({
        claimant,
        respondent,
        amount,
        serviceDescription: 'API integration',
        deadline: new Date('2026-01-15T00:00:00Z'),
      });

      expect(evidence.type).toBe('service_not_delivered');
      expect(evidence.description).toContain('API integration');
      expect(evidence.description).toContain('2026-01-15');
      expect(evidence.details.serviceDescription).toBe('API integration');
      expect(evidence.details.agreedDeadline).toBe('2026-01-15T00:00:00.000Z');
    });

    it('should include payment tx hash when provided', () => {
      const evidence = QuickEvidence.serviceNotDelivered({
        claimant,
        respondent,
        amount,
        serviceDescription: 'Data processing',
        deadline: new Date('2026-01-20'),
        paymentTxHash: '0xabc123',
      });

      expect(evidence.details.paymentTxHash).toBe('0xabc123');
    });
  });

  describe('qualityIssues', () => {
    it('should create quality issues evidence', () => {
      const issues = ['No error handling', 'Missing tests', 'Security vulnerabilities'];
      const evidence = QuickEvidence.qualityIssues({
        claimant,
        respondent,
        amount,
        issues,
      });

      expect(evidence.type).toBe('quality_issues');
      expect(evidence.description).toContain('No error handling');
      expect(evidence.description).toContain('Missing tests');
      expect(evidence.details.issues).toEqual(issues);
    });

    it('should include delivered work hash when provided', () => {
      const evidence = QuickEvidence.qualityIssues({
        claimant,
        respondent,
        amount,
        issues: ['Broken'],
        deliveredWorkHash: 'ipfs://QmXyz',
      });

      expect(evidence.details.deliveredWorkHash).toBe('ipfs://QmXyz');
    });
  });

  describe('partialDelivery', () => {
    it('should create partial delivery evidence', () => {
      const evidence = QuickEvidence.partialDelivery({
        claimant,
        respondent,
        amount,
        deliveredPercentage: 40,
        missingItems: ['Documentation', 'Test suite'],
      });

      expect(evidence.type).toBe('partial_delivery');
      expect(evidence.description).toContain('40%');
      expect(evidence.description).toContain('Documentation');
      expect(evidence.details.deliveredPercentage).toBe(40);
      expect(evidence.details.missingItems).toEqual(['Documentation', 'Test suite']);
    });

    it('should handle 0% delivery', () => {
      const evidence = QuickEvidence.partialDelivery({
        claimant,
        respondent,
        amount,
        deliveredPercentage: 0,
        missingItems: ['Everything'],
      });

      expect(evidence.description).toContain('0%');
    });
  });

  describe('custom', () => {
    it('should create custom dispute evidence', () => {
      const evidence = QuickEvidence.custom({
        claimant,
        respondent,
        amount,
        title: 'API Rate Limit Exceeded',
        description: 'Agent exceeded agreed rate limits causing service disruption',
      });

      expect(evidence.type).toBe('other');
      expect(evidence.title).toBe('API Rate Limit Exceeded');
      expect(evidence.description).toContain('rate limits');
    });

    it('should include custom details', () => {
      const evidence = QuickEvidence.custom({
        claimant,
        respondent,
        amount,
        title: 'Custom Issue',
        description: 'Something went wrong',
        details: {
          errorCode: 'ERR_CUSTOM',
          affectedRecords: 150,
        },
      });

      expect(evidence.details.errorCode).toBe('ERR_CUSTOM');
      expect(evidence.details.affectedRecords).toBe(150);
    });

    it('should default to empty details', () => {
      const evidence = QuickEvidence.custom({
        claimant,
        respondent,
        amount,
        title: 'Simple Issue',
        description: 'Basic dispute',
      });

      expect(evidence.details).toEqual({});
    });
  });
});

describe('Evidence Structure', () => {
  const claimant = '0x1111111111111111111111111111111111111111' as `0x${string}`;
  const respondent = '0x2222222222222222222222222222222222222222' as `0x${string}`;

  it('should serialize amount as string (bigint compatibility)', () => {
    const evidence = buildEvidence({
      type: 'payment_dispute',
      claimant,
      respondent,
      amount: 123456789012345678901234567890n,
      description: 'Large amount',
    });

    expect(typeof evidence.amount).toBe('string');
    expect(evidence.amount).toBe('123456789012345678901234567890');
  });

  it('should produce JSON-serializable evidence', () => {
    const evidence = QuickEvidence.qualityIssues({
      claimant,
      respondent,
      amount: 1000000000000000000n,
      issues: ['Bug 1', 'Bug 2'],
    });

    // Should not throw
    const json = JSON.stringify(evidence);
    const parsed = JSON.parse(json);
    
    expect(parsed.type).toBe('quality_issues');
    expect(parsed.amount).toBe('1000000000000000000');
    expect(parsed.details.issues).toEqual(['Bug 1', 'Bug 2']);
  });
});
