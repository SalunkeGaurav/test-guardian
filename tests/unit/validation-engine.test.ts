import { describe, it, expect } from 'vitest';
import type { ElementNode } from '../../src/models/snapshot.js';
import type { ReplaySession, ReplayStep } from '../../src/models/replay.js';
import type { HealingCandidate } from '../../src/models/healing-candidate.js';
import { ValidationEngine } from '../../src/core/validation/engine.js';
import { resolveLocatorExpression } from '../../src/core/validation/resolver.js';
import { detectFalsePositives } from '../../src/core/validation/false-positive.js';
import { computeValidationConfidence, determineStatus, evaluateInteractionSuccess, computeElementDepth } from '../../src/core/validation/scoring.js';

// ─── Helpers ────────────────────────────────────────────────────────

function makeNode(overrides: Partial<ElementNode> & { tagName: string }): ElementNode {
  return {
    attributes: {},
    children: [],
    visible: true,
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<HealingCandidate> & { proposedStrategy: string; proposedValue: string }): HealingCandidate {
  return {
    id: 'cand-1',
    locatorId: 'loc-1',
    originalExpression: '#old-id',
    proposedExpression: '',
    proposedStrategy: overrides.proposedStrategy,
    proposedValue: overrides.proposedValue,
    strategy: 'attribute-similarity',
    confidence: 0.7,
    ranking: { overall: 0.7, survivabilityScore: 0.5, structuralSimilarity: 0, attributeMatchScore: 0, hierarchyStability: 0, replayContextConfidence: 0 },
    explanation: {
      whyMatched: 'test',
      structuralChanges: [],
      confidenceBreakdown: { overall: 0.7, survivabilityScore: 0.5, structuralSimilarity: 0, attributeMatchScore: 0, hierarchyStability: 0, replayContextConfidence: 0 },
      survivabilityReasoning: 'test',
      attributeChanges: [],
      strategyApplied: 'attribute-similarity',
    },
    domEvidence: { matchedPath: '', matchedTag: '', stableAttributeMatches: [] },
    validated: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeSession(overrides: Partial<ReplaySession> & { steps: ReplayStep[] }): ReplaySession {
  return {
    id: 'session-1',
    traceId: 'trace-1',
    testName: 'test',
    testFile: 'test.spec.ts',
    framework: 'playwright',
    schemaVersion: 1,
    entryUrl: 'https://example.com',
    urlTransitions: [],
    redirectChain: [],
    frameContext: [],
    modalDialogContext: [],
    createdAt: Date.now(),
    ...overrides,
  };
}

function makeStep(overrides: Partial<ReplayStep> & { actionType: string }): ReplayStep {
  return {
    stepId: 'step-1',
    timestamp: Date.now(),
    actionType: overrides.actionType as ReplayStep['actionType'],
    pageUrl: 'https://example.com/page',
    result: { success: true, duration: 100 },
    navigationContext: { url: 'https://example.com/page' },
    ...overrides,
  } as ReplayStep;
}

// ─── Resolver Tests ─────────────────────────────────────────────────

describe('LocatorResolver', () => {
  it('resolves by id strategy', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { id: 'submit-btn' } })];
    const result = resolveLocatorExpression(dom, 'id', 'submit-btn');
    expect(result).toHaveLength(1);
    expect(result[0]!.tagName).toBe('button');
  });

  it('resolves by testid strategy', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { 'data-testid': 'login-btn' } })];
    const result = resolveLocatorExpression(dom, 'testid', 'login-btn');
    expect(result).toHaveLength(1);
  });

  it('resolves by aria-label strategy', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { 'aria-label': 'Close' } })];
    const result = resolveLocatorExpression(dom, 'aria-label', 'Close');
    expect(result).toHaveLength(1);
  });

  it('resolves by role strategy', () => {
    const dom = [makeNode({ tagName: 'div', attributes: { role: 'button' } })];
    const result = resolveLocatorExpression(dom, 'role', 'button');
    expect(result).toHaveLength(1);
  });

  it('resolves by name strategy', () => {
    const dom = [makeNode({ tagName: 'input', attributes: { name: 'email' } })];
    const result = resolveLocatorExpression(dom, 'name', 'email');
    expect(result).toHaveLength(1);
  });

  it('resolves by placeholder strategy', () => {
    const dom = [makeNode({ tagName: 'input', attributes: { placeholder: 'Enter email' } })];
    const result = resolveLocatorExpression(dom, 'placeholder', 'Enter email');
    expect(result).toHaveLength(1);
  });

  it('resolves by text strategy', () => {
    const dom = [makeNode({ tagName: 'button', textContent: 'Submit Form' })];
    const result = resolveLocatorExpression(dom, 'text', 'Submit Form');
    expect(result).toHaveLength(1);
  });

  it('resolves by class-name strategy', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { class: 'primary large' } })];
    const result = resolveLocatorExpression(dom, 'class-name', 'primary');
    expect(result).toHaveLength(1);
  });

  it('resolves by tag strategy', () => {
    const dom = [
      makeNode({ tagName: 'div' }),
      makeNode({ tagName: 'button' }),
      makeNode({ tagName: 'span' }),
    ];
    const result = resolveLocatorExpression(dom, 'tag', 'button');
    expect(result).toHaveLength(1);
    expect(result[0]!.tagName).toBe('button');
  });

  it('returns all tag matches for tag strategy', () => {
    const dom = [
      makeNode({ tagName: 'button', attributes: { id: 'b1' } }),
      makeNode({ tagName: 'button', attributes: { id: 'b2' } }),
    ];
    const result = resolveLocatorExpression(dom, 'tag', 'button');
    expect(result).toHaveLength(2);
  });

  describe('CSS selector resolution', () => {
    it('resolves #id CSS selectors', () => {
      const dom = [makeNode({ tagName: 'div', attributes: { id: 'main' } })];
      const result = resolveLocatorExpression(dom, 'css', '#main');
      expect(result).toHaveLength(1);
    });

    it('resolves .class CSS selectors', () => {
      const dom = [makeNode({ tagName: 'div', attributes: { class: 'container' } })];
      const result = resolveLocatorExpression(dom, 'css', '.container');
      expect(result).toHaveLength(1);
    });

    it('resolves tag CSS selectors', () => {
      const dom = [makeNode({ tagName: 'section' })];
      const result = resolveLocatorExpression(dom, 'css', 'section');
      expect(result).toHaveLength(1);
    });

    it('resolves [attr="val"] CSS selectors', () => {
      const dom = [makeNode({ tagName: 'input', attributes: { 'data-testid': 'email' } })];
      const result = resolveLocatorExpression(dom, 'css', '[data-testid="email"]');
      expect(result).toHaveLength(1);
    });

    it('resolves deep descendant elements', () => {
      const dom = [makeNode({
        tagName: 'div',
        children: [makeNode({
          tagName: 'form',
          children: [makeNode({ tagName: 'button', attributes: { id: 'deep-btn' } })],
        })],
      })];
      const result = resolveLocatorExpression(dom, 'id', 'deep-btn');
      expect(result).toHaveLength(1);
    });
  });

  it('returns empty array for no match', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { id: 'existing' } })];
    const result = resolveLocatorExpression(dom, 'id', 'non-existent');
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty DOM', () => {
    const result = resolveLocatorExpression([], 'id', 'anything');
    expect(result).toHaveLength(0);
  });
});

// ─── False-Positive Detection Tests ─────────────────────────────────

describe('FalsePositiveDetection', () => {
  it('detects no-match when element list is empty', () => {
    const fps = detectFalsePositives([], 'click');
    expect(fps.some(fp => fp.type === 'no-match')).toBe(true);
  });

  it('detects multiple matches', () => {
    const dom = [
      makeNode({ tagName: 'button', attributes: { class: 'btn' } }),
      makeNode({ tagName: 'button', attributes: { class: 'btn' } }),
    ];
    const fps = detectFalsePositives(dom, 'click');
    expect(fps.some(fp => fp.type === 'multiple-matches')).toBe(true);
  });

  it('detects hidden element', () => {
    const dom = [makeNode({ tagName: 'button', visible: false })];
    const fps = detectFalsePositives(dom, 'click');
    expect(fps.some(fp => fp.type === 'hidden-element')).toBe(true);
  });

  it('detects element hidden by style', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { style: 'display: none' } })];
    const fps = detectFalsePositives(dom, 'click');
    expect(fps.some(fp => fp.type === 'hidden-element')).toBe(true);
  });

  it('detects element hidden by aria-hidden', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { 'aria-hidden': 'true' } })];
    const fps = detectFalsePositives(dom, 'click');
    expect(fps.some(fp => fp.type === 'hidden-element')).toBe(true);
  });

  it('detects not-interactable for non-fillable element with fill action', () => {
    const dom = [makeNode({ tagName: 'button' })];
    const fps = detectFalsePositives(dom, 'fill');
    expect(fps.some(fp => fp.type === 'not-interactable')).toBe(true);
  });

  it('accepts input element for fill action', () => {
    const dom = [makeNode({ tagName: 'input', attributes: { type: 'text' } })];
    const fps = detectFalsePositives(dom, 'fill');
    expect(fps.some(fp => fp.type === 'not-interactable')).toBe(false);
  });

  it('detects wrong-role for non-clickable element', () => {
    const dom = [makeNode({ tagName: 'aside' })];
    const fps = detectFalsePositives(dom, 'click');
    expect(fps.some(fp => fp.type === 'wrong-role')).toBe(true);
  });

  it('accepts button for click action', () => {
    const dom = [makeNode({ tagName: 'button' })];
    const fps = detectFalsePositives(dom, 'click');
    expect(fps.some(fp => fp.type === 'wrong-role')).toBe(false);
  });

  it('detects hierarchy mismatch with expected tag', () => {
    const dom = [makeNode({ tagName: 'span' })];
    const fps = detectFalsePositives(dom, 'click', [], 'button');
    expect(fps.some(fp => fp.type === 'hierarchy-mismatch')).toBe(true);
  });

  it('detects unstable dynamic attributes (auto-generated id)', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { id: 'btn-123-456' } })];
    const fps = detectFalsePositives(dom, 'click');
    expect(fps.some(fp => fp.type === 'unstable-dynamic')).toBe(true);
  });

  it('detects unstable dynamic attributes (randomized class)', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { class: 'css-abc123' } })];
    const fps = detectFalsePositives(dom, 'click');
    expect(fps.some(fp => fp.type === 'unstable-dynamic')).toBe(true);
  });

  it('returns no false positives for clean match', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { id: 'clean-id', class: 'normal' } })];
    const fps = detectFalsePositives(dom, 'click');
    expect(fps).toHaveLength(0);
  });

  it('detects disabled element', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { disabled: '' } })];
    const fps = detectFalsePositives(dom, 'click');
    expect(fps.some(fp => fp.type === 'not-interactable')).toBe(true);
  });
});

// ─── Scoring Tests ──────────────────────────────────────────────────

describe('ValidationScoring', () => {
  it('produces 0-1 confidence score', () => {
    const score = computeValidationConfidence({
      matches: [makeNode({ tagName: 'button' })],
      falsePositives: [],
      interactionSuccess: true,
      stepSuccessful: true,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('produces deterministic scores for same inputs', () => {
    const input = {
      matches: [makeNode({ tagName: 'button', attributes: { id: 'btn' } })],
      falsePositives: [],
      interactionSuccess: true,
      stepSuccessful: true,
      expectedTag: 'button',
    };
    const s1 = computeValidationConfidence(input);
    const s2 = computeValidationConfidence(input);
    expect(s1).toBe(s2);
  });

  it('reduces score for false positives', () => {
    const cleanScore = computeValidationConfidence({
      matches: [makeNode({ tagName: 'button' })],
      falsePositives: [],
      interactionSuccess: true,
      stepSuccessful: true,
    });
    const dirtyScore = computeValidationConfidence({
      matches: [makeNode({ tagName: 'button' }), makeNode({ tagName: 'button' })],
      falsePositives: [{ type: 'multiple-matches', detail: 'test' }],
      interactionSuccess: true,
      stepSuccessful: true,
    });
    expect(dirtyScore).toBeLessThan(cleanScore);
  });

  it('scores zero for no matches', () => {
    const score = computeValidationConfidence({
      matches: [],
      falsePositives: [{ type: 'no-match', detail: 'no match' }],
      interactionSuccess: false,
      stepSuccessful: false,
    });
    expect(score).toBe(0);
  });

  it('scores higher for single unique match', () => {
    const score = computeValidationConfidence({
      matches: [makeNode({ tagName: 'button' })],
      falsePositives: [],
      interactionSuccess: true,
      stepSuccessful: true,
    });
    expect(score).toBeGreaterThan(0.5);
  });

  it('determineStatus returns passed for clean matches', () => {
    const status = determineStatus(
      [makeNode({ tagName: 'button' })],
      [],
      true,
    );
    expect(status).toBe('passed');
  });

  it('determineStatus returns failed for no matches', () => {
    const status = determineStatus([], [], false);
    expect(status).toBe('failed');
  });

  it('determineStatus returns ambiguous for multiple matches', () => {
    const fps = [{ type: 'multiple-matches' as const, detail: '2 matches' }];
    const status = determineStatus(
      [makeNode({ tagName: 'button' }), makeNode({ tagName: 'button' })],
      fps,
      true,
    );
    expect(status).toBe('ambiguous');
  });

  it('determineStatus returns failed for hidden element', () => {
    const fps = [{ type: 'hidden-element' as const, detail: 'hidden' }];
    const status = determineStatus(
      [makeNode({ tagName: 'button' })],
      fps,
      false,
    );
    expect(status).toBe('failed');
  });

  it('evaluateInteractionSuccess returns failure for no matches', () => {
    const result = evaluateInteractionSuccess([], 'click');
    expect(result.success).toBe(false);
  });

  it('evaluateInteractionSuccess returns failure for multiple matches', () => {
    const result = evaluateInteractionSuccess(
      [makeNode({ tagName: 'button' }), makeNode({ tagName: 'button' })],
      'click',
    );
    expect(result.success).toBe(false);
  });

  it('evaluateInteractionSuccess returns success for single visible match', () => {
    const result = evaluateInteractionSuccess(
      [makeNode({ tagName: 'button' })],
      'click',
    );
    expect(result.success).toBe(true);
  });

  it('evaluateInteractionSuccess rejects fill on non-input element', () => {
    const result = evaluateInteractionSuccess(
      [makeNode({ tagName: 'button' })],
      'fill',
    );
    expect(result.success).toBe(false);
  });

  it('computeElementDepth returns correct depth', () => {
    const dom = [makeNode({
      tagName: 'div',
      children: [makeNode({
        tagName: 'form',
        children: [makeNode({ tagName: 'button', attributes: { id: 'target' } })],
      })],
    })];
    const target = dom[0]!.children[0]!.children[0]!;
    const depth = computeElementDepth(target, dom);
    expect(depth).toBe(2);
  });

  it('computeElementDepth returns -1 for not found', () => {
    const dom = [makeNode({ tagName: 'div' })];
    const orphan = makeNode({ tagName: 'span' });
    const depth = computeElementDepth(orphan, dom);
    expect(depth).toBe(-1);
  });
});

// ─── ValidationEngine Tests ─────────────────────────────────────────

describe('ValidationEngine', () => {
  it('validates a successful proposal resolution', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { id: 'submit-btn', 'data-testid': 'submit' } })];
    const candidate = makeCandidate({ proposedStrategy: 'testid', proposedValue: 'submit', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: ['data-testid'] } });
    const step = makeStep({ actionType: 'click' });
    const session = makeSession({ steps: [step] });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, replaySession: session, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('passed');
    expect(result.value.matchedElementCount).toBe(1);
    expect(result.value.interactionSuccess).toBe(true);
    expect(result.value.replayConfidence).toBeGreaterThan(0.5);
    expect(result.value.falsePositiveIndicators).toHaveLength(0);
    expect(result.value.replaySessionId).toBe('session-1');
    expect(result.value.proposalId).toBe(candidate.id);
    expect(result.value.locatorId).toBe('loc-1');
  });

  it('rejects proposal with no DOM match', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { id: 'real-id' } })];
    const candidate = makeCandidate({ proposedStrategy: 'id', proposedValue: 'fake-id' });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('failed');
    expect(result.value.matchedElementCount).toBe(0);
    expect(result.value.replayConfidence).toBe(0);
    expect(result.value.falsePositiveIndicators.some(fp => fp.type === 'no-match')).toBe(true);
  });

  it('rejects ambiguous locator with multiple matches', () => {
    const dom = [
      makeNode({ tagName: 'button', attributes: { class: 'btn' } }),
      makeNode({ tagName: 'button', attributes: { class: 'btn' } }),
    ];
    const candidate = makeCandidate({ proposedStrategy: 'tag', proposedValue: 'button' });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('ambiguous');
    expect(result.value.matchedElementCount).toBe(2);
  });

  it('rejects hidden element proposal', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { id: 'hidden-btn' }, visible: false })];
    const candidate = makeCandidate({ proposedStrategy: 'id', proposedValue: 'hidden-btn' });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('failed');
    expect(result.value.falsePositiveIndicators.some(fp => fp.type === 'hidden-element')).toBe(true);
  });

  it('detects wrong role for non-clickable element', () => {
    const dom = [makeNode({ tagName: 'aside', attributes: { id: 'sidebar' } })];
    const candidate = makeCandidate({ proposedStrategy: 'id', proposedValue: 'sidebar' });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.falsePositiveIndicators.some(fp => fp.type === 'wrong-role')).toBe(true);
  });

  it('handles empty target DOM gracefully', () => {
    const candidate = makeCandidate({ proposedStrategy: 'id', proposedValue: 'btn' });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: [], stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('error');
  });

  it('produces deterministic results for same inputs', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { id: 'btn', 'data-testid': 'test-btn' } })];
    const candidate = makeCandidate({ proposedStrategy: 'testid', proposedValue: 'test-btn', domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: ['data-testid'] } });
    const step = makeStep({ actionType: 'click' });
    const session = makeSession({ steps: [step] });

    const engine = new ValidationEngine();
    const r1 = engine.validate({ candidate, targetDom: dom, replaySession: session, stepIndex: 0 });
    const r2 = engine.validate({ candidate, targetDom: dom, replaySession: session, stepIndex: 0 });

    expect(r1.ok).toBe(r2.ok);
    if (!r1.ok || !r2.ok) return;
    expect(r1.value.status).toBe(r2.value.status);
    expect(r1.value.matchedElementCount).toBe(r2.value.matchedElementCount);
    expect(r1.value.replayConfidence).toBe(r2.value.replayConfidence);
  });

  it('uses replay session step context for action type', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { id: 'btn' } })];
    const candidate = makeCandidate({ proposedStrategy: 'id', proposedValue: 'btn' });
    const step = makeStep({ actionType: 'click' });
    const session = makeSession({ steps: [step] });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, replaySession: session, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.executionMetadata.actionType).toBe('click');
    expect(result.value.executionMetadata.pageUrl).toBe('https://example.com/page');
  });

  it('respects step success from replay session', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { id: 'btn' } })];
    const candidate = makeCandidate({ proposedStrategy: 'id', proposedValue: 'btn' });
    const step = makeStep({ actionType: 'click', result: { success: false, duration: 100, error: 'timeout' } });
    const session = makeSession({ steps: [step] });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, replaySession: session, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Step was not successful, so confidence should reflect that
    expect(result.value.replayConfidence).toBeLessThan(0.9);
  });

  it('validates fill interaction on input element', () => {
    const dom = [makeNode({ tagName: 'input', attributes: { id: 'email-input', type: 'text' } })];
    const candidate = makeCandidate({ proposedStrategy: 'id', proposedValue: 'email-input' });
    const step = makeStep({ actionType: 'fill' });
    const session = makeSession({ steps: [step] });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, replaySession: session, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('passed');
    expect(result.value.interactionSuccess).toBe(true);
  });

  it('rejects fill interaction on button element', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { id: 'btn' } })];
    const candidate = makeCandidate({ proposedStrategy: 'id', proposedValue: 'btn' });
    const step = makeStep({ actionType: 'fill' });
    const session = makeSession({ steps: [step] });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, replaySession: session, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.interactionSuccess).toBe(false);
    expect(result.value.falsePositiveIndicators.some(fp => fp.type === 'not-interactable')).toBe(true);
  });

  it('validates element with correct structure', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { id: 'btn' } })];
    const candidate = makeCandidate({
      proposedStrategy: 'id',
      proposedValue: 'btn',
      domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: [] },
    });
    const step = makeStep({ actionType: 'click' });
    const session = makeSession({ steps: [step] });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, replaySession: session, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.matchedElementCount).toBe(1);
    expect(result.value.replayConfidence).toBeGreaterThan(0.5);
  });

  it('includes failure reason in validation result', () => {
    const dom = [makeNode({ tagName: 'button', attributes: { id: 'btn' }, visible: false })];
    const candidate = makeCandidate({ proposedStrategy: 'id', proposedValue: 'btn' });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.failureReason).toBeTruthy();
    expect(typeof result.value.failureReason).toBe('string');
  });

  it('handles deeply nested DOM structure', () => {
    let deep: ElementNode = makeNode({ tagName: 'button', attributes: { id: 'deep-target' } });
    for (let i = 0; i < 50; i++) {
      deep = makeNode({ tagName: 'div', children: [deep] });
    }
    const dom = [deep];
    const candidate = makeCandidate({ proposedStrategy: 'id', proposedValue: 'deep-target' });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('passed');
    expect(result.value.matchedElementCount).toBe(1);
  });
});

// ─── Integration: Engine + Resolver + FalsePositive + Scoring ──────

describe('ValidationEngine Integration', () => {
  it('full pipeline: passed validation for clean proposal', () => {
    const dom = [makeNode({
      tagName: 'button',
      attributes: { 'data-testid': 'submit-form', class: 'primary' },
      textContent: 'Submit',
    })];
    const candidate = makeCandidate({
      proposedStrategy: 'testid',
      proposedValue: 'submit-form',
      domEvidence: { matchedPath: 'button', matchedTag: 'button', stableAttributeMatches: ['data-testid'] },
    });
    const step = makeStep({ actionType: 'click', result: { success: true, duration: 50 } });
    const session = makeSession({ steps: [step] });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, replaySession: session, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('passed');
    expect(result.value.replayConfidence).toBeGreaterThanOrEqual(0.7);
    expect(result.value.falsePositiveIndicators).toHaveLength(0);
  });

  it('full pipeline: failed validation for non-existent element', () => {
    const dom = [makeNode({ tagName: 'div' })];
    const candidate = makeCandidate({ proposedStrategy: 'id', proposedValue: 'non-existent' });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('failed');
    expect(result.value.matchedElementCount).toBe(0);
    expect(result.value.replayConfidence).toBe(0);
  });

  it('full pipeline: ambiguous for non-unique locator', () => {
    const dom = [
      makeNode({ tagName: 'input', attributes: { name: 'email', class: 'field' } }),
      makeNode({ tagName: 'input', attributes: { name: 'email', class: 'field' } }),
    ];
    const candidate = makeCandidate({ proposedStrategy: 'name', proposedValue: 'email' });

    const engine = new ValidationEngine();
    const result = engine.validate({ candidate, targetDom: dom, stepIndex: 0 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe('ambiguous');
  });

  it('full pipeline: replay reproducibility', () => {
    const dom = [makeNode({ tagName: 'a', attributes: { id: 'link', href: '#home' } })];
    const candidate = makeCandidate({ proposedStrategy: 'id', proposedValue: 'link', domEvidence: { matchedPath: 'a', matchedTag: 'a', stableAttributeMatches: [] } });
    const step = makeStep({ actionType: 'click' });
    const session = makeSession({ steps: [step] });

    const engine = new ValidationEngine();
    const results = Array.from({ length: 5 }, () =>
      engine.validate({ candidate, targetDom: dom, replaySession: session, stepIndex: 0 }),
    );

    const firstStatus = results[0];
    expect(firstStatus.ok).toBe(true);
    if (!firstStatus.ok) return;
    for (const r of results) {
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      expect(r.value.status).toBe(firstStatus.value.status);
      expect(r.value.matchedElementCount).toBe(firstStatus.value.matchedElementCount);
      expect(r.value.replayConfidence).toBe(firstStatus.value.replayConfidence);
    }
  });

  it('handles malformed element with missing attributes', () => {
    const dom = [makeNode({ tagName: 'button', attributes: undefined as unknown as Record<string, string> })];
    const candidate = makeCandidate({ proposedStrategy: 'tag', proposedValue: 'button' });

    const engine = new ValidationEngine();
    expect(() => engine.validate({ candidate, targetDom: dom, stepIndex: 0 })).not.toThrow();
  });

  it('handles null candidate', () => {
    const engine = new ValidationEngine();
    expect(() => engine.validate({ candidate: null as unknown as HealingCandidate, targetDom: [], stepIndex: 0 })).not.toThrow();
  });
});
