import { describe, it, expect } from 'vitest';
import type { ElementNode } from '../../src/models/snapshot.js';
import type { Locator } from '../../src/models/locator.js';
import { HealingEngine } from '../../src/core/healing/engine.js';
import { collectCandidates } from '../../src/core/healing/strategies.js';
import { rankCandidates, removeLowConfidence, deduplicateCandidates, rankCandidate } from '../../src/core/healing/ranker.js';
import type { HealingCandidate } from '../../src/models/healing-candidate.js';
import { analyzeLocatorSurvivability } from '../../src/core/dom/survivability.js';
import { diffTrees } from '../../src/core/dom/comparator.js';

function makeNode(overrides: Partial<ElementNode> & { tagName: string }): ElementNode {
  return {
    attributes: {},
    children: [],
    visible: true,
    ...overrides,
  };
}

function makeLocator(overrides: Partial<Locator> & { id: string; value: string }): Locator {
  return {
    strategy: 'css',
    expression: overrides.value,
    sourceFile: 'test.spec.ts',
    sourceLine: 1,
    propertyName: null,
    verified: false,
    ...overrides,
  };
}

describe('HealingEngine', () => {
  it('produces ranked candidates for a broken locator', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'submit', 'data-testid': 'submit-btn', class: 'btn' }, textContent: 'Submit' }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'new-submit', 'data-testid': 'submit-btn', class: 'btn-new' }, textContent: 'Submit' }),
    ];
    const locator = makeLocator({ id: 'loc-1', value: '#submit' });

    const engine = new HealingEngine();
    const result = engine.heal({ locator, originalDom, currentDom });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.length).toBeGreaterThan(0);
    expect(result.value[0]!.confidence).toBeGreaterThan(0);
  });

  it('returns failure for locator with no candidates', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'div', attributes: { id: 'old' } }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'section' }),
    ];
    const locator = makeLocator({ id: 'loc-none', value: '#old' });

    const engine = new HealingEngine();
    const result = engine.heal({ locator, originalDom, currentDom });
    expect(result.ok).toBe(false);
  });

  it('candidates have correct structure', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'login-btn', id: 'old' }, textContent: 'Login' }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'login-btn', id: 'new' }, textContent: 'Login' }),
    ];
    const locator = makeLocator({ id: 'loc-struct', value: '#old' });

    const engine = new HealingEngine();
    const result = engine.heal({ locator, originalDom, currentDom });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const candidate = result.value[0]!;
    expect(candidate.id).toBeTruthy();
    expect(candidate.locatorId).toBe('loc-struct');
    expect(candidate.originalExpression).toBeTruthy();
    expect(candidate.proposedExpression).toBeTruthy();
    expect(candidate.strategy).toBeTruthy();
    expect(candidate.confidence).toBeGreaterThanOrEqual(0);
    expect(candidate.confidence).toBeLessThanOrEqual(1);
    expect(candidate.ranking.overall).toBeGreaterThanOrEqual(0);
    expect(candidate.explanation.whyMatched).toBeTruthy();
    expect(candidate.explanation.survivabilityReasoning).toBeTruthy();
    expect(candidate.domEvidence.matchedPath).toBeTruthy();
    expect(candidate.validated).toBe(false);
  });
});

describe('Candidate Strategies', () => {
  it('attribute-similarity finds element by stable attr', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'submit', class: 'old' } }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'submit', class: 'new' } }),
    ];
    const locator = makeLocator({ id: 'loc-attr', value: '#old' });

    const candidates = collectCandidates(locator, originalDom, currentDom);
    const attrCandidates = candidates.filter(c => c.strategy === 'attribute-similarity');
    expect(attrCandidates.length).toBeGreaterThan(0);
    expect(attrCandidates[0]!.proposedExpression).toContain('submit');
  });

  it('structural-proximity finds same-tag sibling at same depth', () => {
    // Original has target button as second child in nav
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'nav', children: [
        makeNode({ tagName: 'a', attributes: { href: '#home' }, textContent: 'Home' }),
        makeNode({ tagName: 'button', attributes: { id: 'target-btn' }, textContent: 'Menu' }),
      ]}),
    ];
    // Current has the button gone from nav; similar button at same depth in sibling nav
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'nav', children: [
        makeNode({ tagName: 'a', attributes: { href: '#home' }, textContent: 'Home' }),
      ]}),
      makeNode({ tagName: 'nav', children: [
        makeNode({ tagName: 'a', attributes: { href: '#about' }, textContent: 'About' }),
        makeNode({ tagName: 'button', attributes: { id: 'new-menu-btn' }, textContent: 'Menu' }),
      ]}),
    ];
    const locator = makeLocator({ id: 'loc-str', value: '#target-btn' });

    const candidates = collectCandidates(locator, originalDom, currentDom);
    const structCandidates = candidates.filter(c => c.strategy === 'structural-proximity');
    expect(structCandidates.length).toBeGreaterThan(0);
  });

  it('text-proximity matches by similar text', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', textContent: 'Submit Form', attributes: { id: 's1' } }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', textContent: 'Submit Form', attributes: { id: 's2' } }),
    ];
    const locator = makeLocator({ id: 'loc-text', value: '#s1' });

    const candidates = collectCandidates(locator, originalDom, currentDom);
    const textCandidates = candidates.filter(c => c.strategy === 'text-proximity');
    expect(textCandidates.length).toBeGreaterThan(0);
  });

  it('hierarchy-matching finds by grandparent pattern', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'form', children: [
        makeNode({ tagName: 'div', children: [
          makeNode({ tagName: 'input', attributes: { name: 'email' } }),
        ]}),
      ]}),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'form', children: [
        makeNode({ tagName: 'div', children: [
          makeNode({ tagName: 'input', attributes: { name: 'new-email' } }),
        ]}),
      ]}),
    ];
    const locator = makeLocator({ id: 'loc-hier', value: 'input' });

    const candidates = collectCandidates(locator, originalDom, currentDom);
    expect(candidates.length).toBeGreaterThan(0);
  });

  it('accessibility-metadata matches by aria attrs', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'aria-label': 'Close dialog', role: 'button', id: 'old-a11y' } }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'aria-label': 'Close dialog', role: 'button', id: 'new-a11y' } }),
    ];
    const locator = makeLocator({ id: 'loc-a11y', value: '#old-a11y' });

    const candidates = collectCandidates(locator, originalDom, currentDom);
    const a11yCandidates = candidates.filter(c => c.strategy === 'accessibility-metadata');
    expect(a11yCandidates.length).toBeGreaterThan(0);
  });

  it('historical-selector-evolution derives alternative expressions', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'input', attributes: {
        'data-testid': 'email-input', 'aria-label': 'Email', name: 'email', placeholder: 'Enter email', id: 'old',
      }}),
    ];
    const locator = makeLocator({ id: 'loc-hist', value: '#old' });

    const candidates = collectCandidates(locator, originalDom, originalDom);
    const historical = candidates.filter(c => c.strategy === 'historical-selector-evolution');
    expect(historical.length).toBeGreaterThanOrEqual(4);
    const expressions = historical.map(c => c.proposedExpression);
    expect(expressions).toContain('[data-testid="email-input"]');
    expect(expressions).toContain('[aria-label="Email"]');
    expect(expressions).toContain('[name="email"]');
  });
});

describe('Candidate Ranking', () => {
  it('ranks candidates by score descending', () => {
    const candidates: HealingCandidate[] = [
      { confidence: 0.3 } as HealingCandidate,
      { confidence: 0.9 } as HealingCandidate,
      { confidence: 0.6 } as HealingCandidate,
    ];

    const ranked = rankCandidates(candidates);
    expect(ranked[0]!.confidence).toBeGreaterThanOrEqual(ranked[1]!.confidence);
    expect(ranked[1]!.confidence).toBeGreaterThanOrEqual(ranked[2]!.confidence);
  });

  it('produces deterministic ranking for same inputs', () => {
    const candidates: HealingCandidate[] = [
      { confidence: 0.5, strategy: 'attribute-similarity' } as HealingCandidate,
      { confidence: 0.7, strategy: 'text-proximity' } as HealingCandidate,
    ];

    const r1 = rankCandidates(candidates);
    const r2 = rankCandidates(candidates);
    expect(r1[0]!.confidence).toBe(r2[0]!.confidence);
    expect(r1[1]!.confidence).toBe(r2[1]!.confidence);
  });

  it('ranking includes breakdown metadata', () => {
    const candidate = { confidence: 0.5, strategy: 'attribute-similarity' } as HealingCandidate;
    const ranking = rankCandidate(candidate);
    expect(ranking.overall).toBeGreaterThanOrEqual(0);
    expect(ranking.overall).toBeLessThanOrEqual(1);
    expect(typeof ranking.survivabilityScore).toBe('number');
    expect(typeof ranking.structuralSimilarity).toBe('number');
    expect(typeof ranking.attributeMatchScore).toBe('number');
    expect(typeof ranking.hierarchyStability).toBe('number');
    expect(typeof ranking.replayContextConfidence).toBe('number');
  });
});

describe('Low-Confidence Rejection', () => {
  it('removes candidates below threshold', () => {
    const candidates = [
      { confidence: 0.1 } as HealingCandidate,
      { confidence: 0.5 } as HealingCandidate,
      { confidence: 0.05 } as HealingCandidate,
      { confidence: 0.8 } as HealingCandidate,
    ];

    const filtered = removeLowConfidence(candidates, 0.2);
    expect(filtered).toHaveLength(2);
    expect(filtered.every(c => c.confidence >= 0.2)).toBe(true);
  });

  it('uses default threshold of 0.15', () => {
    const candidates = [
      { confidence: 0.1 } as HealingCandidate,
      { confidence: 0.2 } as HealingCandidate,
    ];

    const filtered = removeLowConfidence(candidates);
    expect(filtered).toHaveLength(1);
  });

  it('returns empty array when all below threshold', () => {
    const candidates = [
      { confidence: 0.05 } as HealingCandidate,
      { confidence: 0.1 } as HealingCandidate,
    ];

    const filtered = removeLowConfidence(candidates, 0.5);
    expect(filtered).toHaveLength(0);
  });
});

describe('Duplicate Prevention', () => {
  it('deduplicates by proposed expression', () => {
    const candidates = [
      { proposedExpression: '[data-testid="btn"]' } as HealingCandidate,
      { proposedExpression: '[data-testid="btn"]' } as HealingCandidate,
      { proposedExpression: '#other' } as HealingCandidate,
    ];

    const deduped = deduplicateCandidates(candidates);
    expect(deduped).toHaveLength(2);
  });

  it('keeps first occurrence when deduplicating', () => {
    const candidates = [
      { proposedExpression: '#btn', confidence: 0.9 } as HealingCandidate,
      { proposedExpression: '#btn', confidence: 0.5 } as HealingCandidate,
    ];

    const deduped = deduplicateCandidates(candidates);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.confidence).toBe(0.9);
  });
});

describe('Broken Locator Recovery', () => {
  it('recovers from id change when data-testid stable', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'old-id', 'data-testid': 'stable-btn' }, textContent: 'Click' }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'new-id', 'data-testid': 'stable-btn' }, textContent: 'Click' }),
    ];
    const locator = makeLocator({ id: 'loc-recover', value: '#old-id' });

    const engine = new HealingEngine();
    const result = engine.heal({ locator, originalDom, currentDom });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.some(c => c.proposedExpression.includes('stable-btn'))).toBe(true);
  });

  it('recovers from class change when aria-label stable', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { class: 'old-btn', 'aria-label': 'Submit form', id: 's1' } }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { class: 'new-btn', 'aria-label': 'Submit form', id: 's2' } }),
    ];
    const locator = makeLocator({ id: 'loc-class', value: '#s1' });

    const engine = new HealingEngine();
    const result = engine.heal({ locator, originalDom, currentDom });
    expect(result.ok).toBe(true);
  });

  it('recovers from structural move when text preserved', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'div', children: [
        makeNode({ tagName: 'section', children: [
          makeNode({ tagName: 'p', textContent: 'Unique text here', attributes: { id: 'p1' } }),
        ]}),
      ]}),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'div', children: [
        makeNode({ tagName: 'article', children: [
          makeNode({ tagName: 'p', textContent: 'Unique text here', attributes: { id: 'p2' } }),
        ]}),
      ]}),
    ];
    const locator = makeLocator({ id: 'loc-move', value: '#p1' });

    const engine = new HealingEngine();
    const result = engine.heal({ locator, originalDom, currentDom });
    expect(result.ok).toBe(true);
  });
});

describe('Moved Element Detection', () => {
  it('detects when element moved to different parent', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'nav', children: [makeNode({ tagName: 'button', attributes: { 'data-testid': 'menu-btn' } })] }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'header', children: [makeNode({ tagName: 'button', attributes: { 'data-testid': 'menu-btn' } })] }),
    ];
    const locator = makeLocator({ id: 'loc-moved', value: '#menu-btn' });
    const survivability = analyzeLocatorSurvivability(locator, originalDom, currentDom);
    // Element is found (by stable attr), but it moved parent
    expect(survivability.exists).toBe(true);
  });
});

describe('Attribute Rename Detection', () => {
  it('detects renamed class attribute', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { class: 'primary', 'data-testid': 'btn', id: 'b1' } }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { class: 'secondary', 'data-testid': 'btn', id: 'b2' } }),
    ];
    const locator = makeLocator({ id: 'loc-rename', value: '#b1' });
    const survivability = analyzeLocatorSurvivability(locator, originalDom, currentDom);
    expect(survivability.attributesRenamed.length).toBeGreaterThanOrEqual(1);
    expect(survivability.attributesRenamed.some(a => a.name === 'class')).toBe(true);
  });
});

describe('Deterministic Ranking', () => {
  it('reproducible ranking for identical inputs', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'btn1', id: 'original' }, textContent: 'Go' }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'btn1', id: 'changed' }, textContent: 'Go' }),
    ];
    const locator = makeLocator({ id: 'loc-repro', value: '#original' });

    const engine = new HealingEngine();
    const r1 = engine.heal({ locator, originalDom, currentDom });
    const r2 = engine.heal({ locator, originalDom, currentDom });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;

    expect(r1.value.length).toBe(r2.value.length);
    for (let i = 0; i < r1.value.length; i++) {
      expect(r1.value[i]!.confidence).toBe(r2.value[i]!.confidence);
      expect(r1.value[i]!.proposedExpression).toBe(r2.value[i]!.proposedExpression);
    }
  });
});

describe('Malformed DOM Handling', () => {
  it('handles empty original DOM', () => {
    const locator = makeLocator({ id: 'loc-empty', value: '#btn' });
    const engine = new HealingEngine();
    const result = engine.heal({ locator, originalDom: [], currentDom: [makeNode({ tagName: 'button' })] });
    expect(result.ok).toBe(false);
  });

  it('handles empty current DOM', () => {
    const locator = makeLocator({ id: 'loc-empty2', value: '#btn' });
    const engine = new HealingEngine();
    const result = engine.heal({ locator, originalDom: [makeNode({ tagName: 'button' })], currentDom: [] });
    expect(result.ok).toBe(false);
  });

  it('handles deeply nested DOM', () => {
    let deepNode: ElementNode = makeNode({ tagName: 'button', attributes: { id: 'deep-btn' } });
    for (let i = 0; i < 200; i++) {
      deepNode = makeNode({ tagName: 'div', children: [deepNode] });
    }
    const locator = makeLocator({ id: 'loc-deep', value: '#deep-btn' });
    const engine = new HealingEngine();
    const result = engine.heal({ locator, originalDom: [deepNode], currentDom: [deepNode] });
    expect(result.ok).toBe(true);
  });

  it('handles nodes with missing attributes', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: undefined as unknown as Record<string, string> }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: undefined as unknown as Record<string, string> }),
    ];
    const locator = makeLocator({ id: 'loc-malformed', value: 'button' });
    const engine = new HealingEngine();
    expect(() => engine.heal({ locator, originalDom, currentDom })).not.toThrow();
  });
});

describe('Replay Context Integration', () => {
  it('attaches replay context ref when provided', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'old', 'data-testid': 'replay-btn' } }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'new', 'data-testid': 'replay-btn' } }),
    ];
    const locator = makeLocator({ id: 'loc-replay', value: '#old' });

    const engine = new HealingEngine();
    const result = engine.heal({
      locator,
      originalDom,
      currentDom,
      replaySession: {
        id: 'replay-session-1',
        traceId: 'trace-1',
        testName: 'login test',
        testFile: 'login.spec.ts',
        framework: 'playwright',
        schemaVersion: 1,
        entryUrl: '',
        urlTransitions: [],
        redirectChain: [],
        frameContext: [],
        modalDialogContext: [],
        steps: [],
        createdAt: Date.now(),
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const c of result.value) {
      expect(c.replayContextRef).toBe('replay-session-1');
    }
  });
});

describe('Candidate Explanation', () => {
  it('provides whyMatched explanation', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'explain-btn', id: 'old' } }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'data-testid': 'explain-btn', id: 'new' } }),
    ];
    const locator = makeLocator({ id: 'loc-exp', value: '#old' });

    const engine = new HealingEngine();
    const result = engine.heal({ locator, originalDom, currentDom });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]!.explanation.whyMatched).toBeTruthy();
    expect(result.value[0]!.explanation.survivabilityReasoning).toBeTruthy();
    expect(result.value[0]!.explanation.confidenceBreakdown).toBeTruthy();
    expect(typeof result.value[0]!.explanation.confidenceBreakdown.overall).toBe('number');
  });
});
