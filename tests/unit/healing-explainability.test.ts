import { describe, it, expect } from 'vitest';
import type { HealingCandidate, CandidateRanking, CandidateExplanation, DomEvidence } from '../../src/models/healing-candidate.js';
import type { ValidationResult } from '../../src/models/validation.js';
import type { RuntimeValidationResult } from '../../src/models/runtime.js';
import { ExplainabilityEngine } from '../../src/core/pipeline/explainability-engine.js';
import { EXPLANATION_SCHEMA_VERSION } from '../../src/models/healing-explanation.js';

function makeCandidate(overrides: Partial<HealingCandidate> & { id: string }): HealingCandidate {
  const ranking: CandidateRanking = {
    overall: 0.7, survivabilityScore: 0.6, structuralSimilarity: 0.5,
    attributeMatchScore: 0.8, hierarchyStability: 0.7, replayContextConfidence: 0.5,
  };
  const domEvidence: DomEvidence = { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: ['data-testid'] };
  const explanation: CandidateExplanation = {
    whyMatched: 'Stable attribute match',
    structuralChanges: [{ whatChanged: 'id changed from old to new', type: 'attribute-change', before: 'old', after: 'new' }],
    confidenceBreakdown: ranking,
    survivabilityReasoning: 'Element exists | Strategy attribute-similarity',
    attributeChanges: [{ name: 'id', before: 'old', after: 'new' }],
    strategyApplied: 'attribute-similarity',
  };
  return {
    id: overrides.id, locatorId: 'loc-1', originalExpression: '#old',
    proposedExpression: '[data-testid="btn"]', proposedStrategy: 'testid', proposedValue: 'btn',
    strategy: 'attribute-similarity', confidence: 0.7, ranking, explanation, domEvidence,
    validated: false, createdAt: Date.now(),
    ...overrides,
  };
}

describe('ExplainabilityEngine', () => {
  it('generates explanation for a high-confidence candidate', () => {
    const engine = new ExplainabilityEngine();
    const candidate = makeCandidate({ id: 'cand-1' });

    const explanation = engine.explain(candidate);

    expect(explanation.proposalId).toBe('cand-1');
    expect(explanation.strategy).toBe('attribute-similarity');
    expect(explanation.confidenceBreakdown.overall).toBe(0.7);
    expect(explanation.rankingExplanation).toContain('High-confidence');
    expect(explanation.domEvidenceSummary).toContain('data-testid');
    expect(explanation.rejectionReasons).toEqual([]);
    expect(explanation.createdAt).toBeGreaterThan(0);
  });

  it('generates explanation for a low-confidence candidate', () => {
    const engine = new ExplainabilityEngine();
    const lowRanking: CandidateRanking = {
      overall: 0.2, survivabilityScore: 0.1, structuralSimilarity: 0.15,
      attributeMatchScore: 0.2, hierarchyStability: 0.3, replayContextConfidence: 0.1,
    };
    const candidate = makeCandidate({
      id: 'cand-low',
      strategy: 'sibling-relationship',
      confidence: 0.2,
      ranking: lowRanking,
      explanation: { ...makeCandidate({ id: 'x' }).explanation, confidenceBreakdown: lowRanking, strategyApplied: 'sibling-relationship' },
    });

    const explanation = engine.explain(candidate);

    expect(explanation.rankingExplanation).toContain('Low-confidence');
    expect(explanation.confidenceBreakdown.overall).toBe(0.2);
  });

  it('includes rejection reasons when provided', () => {
    const engine = new ExplainabilityEngine();
    const candidate = makeCandidate({ id: 'cand-rej' });

    const explanation = engine.explain(candidate, undefined, undefined, undefined, undefined, [
      'Below minimum confidence threshold',
      'Duplicate expression',
    ]);

    expect(explanation.rejectionReasons).toHaveLength(2);
    expect(explanation.rejectionReason).toBe('Below minimum confidence threshold');
  });

  it('includes static validation evidence when provided', () => {
    const engine = new ExplainabilityEngine();
    const candidate = makeCandidate({ id: 'cand-val' });
    const validation: ValidationResult = {
      id: 'val-1', proposalId: 'cand-val', locatorId: 'loc-1', replaySessionId: 'ses-1',
      status: 'passed', matchedElementCount: 1, interactionSuccess: true,
      replayConfidence: 0.85, falsePositiveIndicators: [],
      executionMetadata: { stepIndex: 0, actionType: 'click', pageUrl: '', frame: '', resolvedAt: Date.now() },
      validatedAt: Date.now(),
    };

    const explanation = engine.explain(candidate, validation);

    expect(explanation.evidence.staticValidation).toBeDefined();
    expect(explanation.evidence.staticValidation!.status).toBe('passed');
    expect(explanation.evidence.staticValidation!.replayConfidence).toBe(0.85);
  });

  it('includes runtime evidence when provided', () => {
    const engine = new ExplainabilityEngine();
    const candidate = makeCandidate({ id: 'cand-run' });
    const runtime: RuntimeValidationResult = {
      id: 'run-1', replaySessionId: 'ses-1', proposalId: 'cand-run',
      status: 'passed', executedStepCount: 2, totalStepCount: 2,
      runtimeConfidence: 0.9, runtimeEvidence: [],
      timingMetadata: { startedAt: 0, finishedAt: 0, totalDuration: 0, stepDurations: [] },
      browserMetadata: { browserName: 'chromium' },
      replayDivergence: [], falsePositiveIndicators: [], createdAt: Date.now(),
    };

    const explanation = engine.explain(candidate, undefined, runtime);

    expect(explanation.evidence.runtimeValidation).toBeDefined();
    expect(explanation.evidence.runtimeValidation!.status).toBe('passed');
    expect(explanation.evidence.runtimeValidation!.runtimeConfidence).toBe(0.9);
  });

  it('includes structural change explanation from candidate', () => {
    const engine = new ExplainabilityEngine();
    const candidate = makeCandidate({ id: 'cand-struct' });

    const explanation = engine.explain(candidate);

    expect(explanation.structuralChangeExplanation).toContain('id changed from old to new');
  });

  it('produces deterministic explanations for same input', () => {
    const engine = new ExplainabilityEngine();
    const candidate = makeCandidate({ id: 'cand-det' });

    const e1 = engine.explain(candidate);
    const e2 = engine.explain(candidate);

    expect(e1.rankingExplanation).toBe(e2.rankingExplanation);
    expect(e1.domEvidenceSummary).toBe(e2.domEvidenceSummary);
    expect(e1.structuralChangeExplanation).toBe(e2.structuralChangeExplanation);
  });

  it('generates explanation for text-proximity strategy', () => {
    const engine = new ExplainabilityEngine();
    const candidate = makeCandidate({
      id: 'cand-text',
      strategy: 'text-proximity',
      domEvidence: { matchedPath: 'span', matchedTag: 'span', stableAttributeMatches: [], textContentMatch: 'Submit' },
    });

    const explanation = engine.explain(candidate);

    expect(explanation.strategy).toBe('text-proximity');
    expect(explanation.domEvidenceSummary).toContain('Submit');
  });
});
