import { describe, it, expect } from 'vitest';
import { ConfidenceGovernance } from '../../src/core/pipeline/confidence-governance.js';
import type { HealingCandidate, CandidateRanking, CandidateExplanation, DomEvidence } from '../../src/models/healing-candidate.js';
import type { ValidationResult } from '../../src/models/validation.js';
import type { RuntimeValidationResult, ReplayDivergence, RuntimeFalsePositiveIndicator } from '../../src/models/runtime.js';

function makeCandidate(overrides: Partial<HealingCandidate> & { id: string }): HealingCandidate {
  const ranking: CandidateRanking = { overall: 0.7, survivabilityScore: 0.6, structuralSimilarity: 0.5, attributeMatchScore: 0.8, hierarchyStability: 0.7, replayContextConfidence: 0.5 };
  return {
    id: overrides.id, locatorId: 'loc-1', originalExpression: '#old',
    proposedExpression: '[data-testid="btn"]', proposedStrategy: 'testid', proposedValue: 'btn',
    strategy: 'attribute-similarity', confidence: 0.7, ranking,
    explanation: { whyMatched: 'test', structuralChanges: [], confidenceBreakdown: ranking, survivabilityReasoning: 'test', attributeChanges: [], strategyApplied: 'attribute-similarity' },
    domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: ['data-testid'] },
    validated: false, createdAt: Date.now(),
    ...overrides,
  };
}

function makeValidation(proposalId: string, confidence: number, status: string = 'passed'): ValidationResult {
  return {
    id: `val-${proposalId}`, proposalId, locatorId: 'loc-1', replaySessionId: 'ses-1',
    status: status as any, matchedElementCount: 1, interactionSuccess: true,
    replayConfidence: confidence, falsePositiveIndicators: [],
    executionMetadata: { stepIndex: 0, actionType: 'click', pageUrl: '', frame: '', resolvedAt: Date.now() },
    validatedAt: Date.now(),
  };
}

function makeRuntimeResult(confidence: number, status: string = 'passed', divergences: ReplayDivergence[] = []): RuntimeValidationResult {
  return {
    id: 'run-1', replaySessionId: 'ses-1', proposalId: 'cand-1',
    status: status as any, executedStepCount: 1, totalStepCount: 1,
    runtimeConfidence: confidence, runtimeEvidence: [],
    timingMetadata: { startedAt: 0, finishedAt: 0, totalDuration: 0, stepDurations: [] },
    browserMetadata: { browserName: 'chromium' },
    replayDivergence: divergences, falsePositiveIndicators: [], createdAt: Date.now(),
  };
}

describe('ConfidenceGovernance', () => {
  it('passes all gates for high-confidence unique candidate', () => {
    const governance = new ConfidenceGovernance();
    const candidates = [makeCandidate({ id: 'cand-1' })];
    const validations = new Map([['cand-1', makeValidation('cand-1', 0.85)]]);

    const result = governance.evaluate(candidates, validations);

    expect(result.passed).toBe(true);
    expect(result.gates).toHaveLength(2);
    expect(result.approvedCandidates).toHaveLength(1);
    expect(result.rejectedCandidates).toHaveLength(0);
  });

  it('rejects candidate below minimum static confidence', () => {
    const governance = new ConfidenceGovernance({ minStaticValidationConfidence: 0.5 });
    const candidates = [makeCandidate({ id: 'cand-low' })];
    const validations = new Map([['cand-low', makeValidation('cand-low', 0.3)]]);

    const result = governance.evaluate(candidates, validations);

    expect(result.passed).toBe(false);
    expect(result.gates[0]!.passed).toBe(false);
    expect(result.rejectedCandidates).toHaveLength(1);
    expect(result.rejectedCandidates[0]!.gate).toBe('min-static-confidence');
  });

  it('rejects candidate below minimum runtime confidence', () => {
    const governance = new ConfidenceGovernance({ minRuntimeConfidence: 0.7 });
    const candidates = [makeCandidate({ id: 'cand-1' })];
    const validations = new Map([['cand-1', makeValidation('cand-1', 0.85)]]);
    const runtime = makeRuntimeResult(0.3);

    const result = governance.evaluate(candidates, validations, runtime);

    expect(result.passed).toBe(false);
    const runtimeGate = result.gates.find(g => g.gate === 'min-runtime-confidence');
    expect(runtimeGate).toBeDefined();
    expect(runtimeGate!.passed).toBe(false);
  });

  it('rejects duplicate expressions when uniqueness required', () => {
    const governance = new ConfidenceGovernance({ requireUniqueness: true });
    const candidates = [
      makeCandidate({ id: 'cand-a', proposedExpression: '[data-testid="btn"]' }),
      makeCandidate({ id: 'cand-b', proposedExpression: '[data-testid="btn"]' }),
    ];
    const validations = new Map([
      ['cand-a', makeValidation('cand-a', 0.8)],
      ['cand-b', makeValidation('cand-b', 0.8)],
    ]);

    const result = governance.evaluate(candidates, validations);

    expect(result.passed).toBe(false);
    const uniquenessGate = result.gates.find(g => g.gate === 'uniqueness');
    expect(uniquenessGate).toBeDefined();
    expect(uniquenessGate!.passed).toBe(false);
  });

  it('rejects replay inconsistencies when consistency required', () => {
    const governance = new ConfidenceGovernance({ requireReplayConsistency: true });
    const candidates = [makeCandidate({ id: 'cand-1' })];
    const validations = new Map([['cand-1', makeValidation('cand-1', 0.85)]]);
    const runtime = makeRuntimeResult(0.85, 'diverged', [
      { type: 'url-mismatch', stepIndex: 0, expected: 'https://example.com', actual: 'https://other.com' },
    ]);

    const result = governance.evaluate(candidates, validations, runtime);

    expect(result.passed).toBe(false);
    const consistencyGate = result.gates.find(g => g.gate === 'replay-consistency');
    expect(consistencyGate).toBeDefined();
    expect(consistencyGate!.passed).toBe(false);
  });

  it('uses custom config thresholds', () => {
    const governance = new ConfidenceGovernance({
      minStaticValidationConfidence: 0.9,
      minRuntimeConfidence: 0.95,
    });
    const candidates = [makeCandidate({ id: 'cand-1' })];
    const validations = new Map([['cand-1', makeValidation('cand-1', 0.8)]]);

    const result = governance.evaluate(candidates, validations);

    expect(result.passed).toBe(false);
    expect(result.gates[0]!.passed).toBe(false);
  });

  it('skips uniqueness gate when requireUniqueness is false', () => {
    const governance = new ConfidenceGovernance({ requireUniqueness: false });
    const candidates = [
      makeCandidate({ id: 'cand-a', proposedExpression: '[data-testid="btn"]' }),
      makeCandidate({ id: 'cand-b', proposedExpression: '[data-testid="btn"]' }),
    ];
    const validations = new Map([
      ['cand-a', makeValidation('cand-a', 0.8)],
      ['cand-b', makeValidation('cand-b', 0.8)],
    ]);

    const result = governance.evaluate(candidates, validations);

    expect(result.gates.find(g => g.gate === 'uniqueness')).toBeUndefined();
  });

  it('produces deterministic results for same inputs', () => {
    const governance = new ConfidenceGovernance();
    const candidates = [makeCandidate({ id: 'cand-1' })];
    const validations = new Map([['cand-1', makeValidation('cand-1', 0.85)]]);

    const r1 = governance.evaluate(candidates, validations);
    const r2 = governance.evaluate(candidates, validations);

    expect(r1.passed).toBe(r2.passed);
    expect(r1.gates.length).toBe(r2.gates.length);
    expect(r1.approvedCandidates.length).toBe(r2.approvedCandidates.length);
  });
});
