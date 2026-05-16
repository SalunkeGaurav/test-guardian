import { describe, it, expect } from 'vitest';
import { StabilityAnalyzer } from '../../src/core/pipeline/stability-analyzer.js';
import type { HealingCandidate, CandidateRanking, CandidateExplanation, DomEvidence } from '../../src/models/healing-candidate.js';
import type { ElementNode } from '../../src/models/snapshot.js';
import { DEFAULT_STABILITY_RUNS } from '../../src/models/stability.js';

function makeNode(overrides: Partial<ElementNode> & { tagName: string }): ElementNode {
  return { attributes: {}, children: [], visible: true, ...overrides };
}

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

describe('StabilityAnalyzer', () => {
  it('produces a stability report with multiple runs', async () => {
    const analyzer = new StabilityAnalyzer();
    const candidate = makeCandidate({ id: 'cand-stable' });
    const targetDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'new-submit', 'data-testid': 'btn' }, textContent: 'Submit' }),
    ];

    const report = await analyzer.analyze(candidate, targetDom, 3);

    expect(report.candidateId).toBe('cand-stable');
    expect(report.runCount).toBe(3);
    expect(report.runs).toHaveLength(3);
    expect(report.reproducibilityScore).toBeGreaterThan(0);
    expect(report.createdAt).toBeGreaterThan(0);
  });

  it('uses default run count when not specified', async () => {
    const analyzer = new StabilityAnalyzer();
    const candidate = makeCandidate({ id: 'cand-default' });
    const targetDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'btn' } }),
    ];

    const report = await analyzer.analyze(candidate, targetDom);

    expect(report.runCount).toBe(DEFAULT_STABILITY_RUNS);
    expect(report.runs).toHaveLength(DEFAULT_STABILITY_RUNS);
  });

  it('computes reproducibility score correctly for identical runs', async () => {
    const analyzer = new StabilityAnalyzer();
    const candidate = makeCandidate({ id: 'cand-rep' });
    const targetDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'btn', id: 'btn-1' } }),
    ];

    const report = await analyzer.analyze(candidate, targetDom, 3);

    // All runs should be identical since no randomness
    expect(report.reproducibilityScore).toBe(1);
  });

  it('detects no flakiness for stable candidates', async () => {
    const analyzer = new StabilityAnalyzer();
    const candidate = makeCandidate({ id: 'cand-noflak' });
    const targetDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'btn' } }),
    ];

    const report = await analyzer.analyze(candidate, targetDom, 2);

    expect(report.flakinessIndicators).toEqual([]);
    expect(report.replayConsistent).toBe(true);
  });

  it('computes confidence variance of zero for deterministic validations', async () => {
    const analyzer = new StabilityAnalyzer();
    const candidate = makeCandidate({ id: 'cand-var' });
    const targetDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'btn' } }),
    ];

    const report = await analyzer.analyze(candidate, targetDom, 3);

    expect(report.confidenceVariance).toBe(0);
  });

  it('handles single run gracefully', async () => {
    const analyzer = new StabilityAnalyzer();
    const candidate = makeCandidate({ id: 'cand-single' });
    const targetDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'btn' } }),
    ];

    const report = await analyzer.analyze(candidate, targetDom, 1);

    expect(report.runCount).toBe(1);
    expect(report.reproducibilityScore).toBe(1);
    expect(report.flakinessIndicators).toEqual([]);
  });

  it('produces deterministic reports for same inputs', async () => {
    const analyzer = new StabilityAnalyzer();
    const candidate = makeCandidate({ id: 'cand-det' });
    const targetDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'btn' } }),
    ];

    const r1 = await analyzer.analyze(candidate, targetDom, 2);
    const r2 = await analyzer.analyze(candidate, targetDom, 2);

    expect(r1.reproducibilityScore).toBe(r2.reproducibilityScore);
    expect(r1.confidenceVariance).toBe(r2.confidenceVariance);
    expect(r1.flakinessIndicators).toEqual(r2.flakinessIndicators);
    expect(r1.runs.length).toBe(r2.runs.length);
  });
});
