import { describe, it, expect, beforeEach } from 'vitest';
import type { ElementNode } from '../../src/models/snapshot.js';
import type { Locator } from '../../src/models/locator.js';
import { normalizeElementTree, flattenToStableMap } from '../../src/core/dom/normalizer.js';
import { diffTrees } from '../../src/core/dom/comparator.js';
import { analyzeLocatorSurvivability } from '../../src/core/dom/survivability.js';
import { computeSimilarity } from '../../src/core/dom/scoring.js';

function makeNode(overrides: Partial<ElementNode> & { tagName: string }): ElementNode {
  return {
    attributes: {},
    children: [],
    visible: true,
    ...overrides,
  };
}

describe('DOM Normalizer', () => {
  it('collapses whitespace in text content', () => {
    const nodes: ElementNode[] = [
      makeNode({
        tagName: 'div',
        textContent: '  Hello   World  ',
        children: [],
      }),
    ];
    const normalized = normalizeElementTree(nodes);
    expect(normalized[0]!.normalizedText).toBe('Hello World');
  });

  it('removes random css-module classes', () => {
    const nodes: ElementNode[] = [
      makeNode({
        tagName: 'button',
        attributes: { class: 'btn css-abc123 primary' },
      }),
    ];
    const normalized = normalizeElementTree(nodes);
    expect(normalized[0]!.normalizedAttributes['class']).toBe('btn primary');
  });

  it('strips unstable auto-generated IDs', () => {
    const nodes: ElementNode[] = [
      makeNode({
        tagName: 'div',
        attributes: { id: 'a1b2c3d4e5f6' },
      }),
    ];
    const normalized = normalizeElementTree(nodes);
    expect(normalized[0]!.normalizedAttributes['id']).toBeUndefined();
  });

  it('preserves stable IDs', () => {
    const nodes: ElementNode[] = [
      makeNode({
        tagName: 'div',
        attributes: { id: 'submit-button' },
      }),
    ];
    const normalized = normalizeElementTree(nodes);
    expect(normalized[0]!.normalizedAttributes['id']).toBe('submit-button');
  });

  it('preserves data-testid', () => {
    const nodes: ElementNode[] = [
      makeNode({
        tagName: 'button',
        attributes: { 'data-testid': 'login-btn' },
      }),
    ];
    const normalized = normalizeElementTree(nodes);
    expect(normalized[0]!.stableAttributes['data-testid']).toBe('login-btn');
  });

  it('preserves aria attributes', () => {
    const nodes: ElementNode[] = [
      makeNode({
        tagName: 'input',
        attributes: { 'aria-label': 'Username', role: 'textbox' },
      }),
    ];
    const normalized = normalizeElementTree(nodes);
    expect(normalized[0]!.stableAttributes['aria-label']).toBe('Username');
    expect(normalized[0]!.stableAttributes['role']).toBe('textbox');
  });

  it('detects dynamic data-v- attributes', () => {
    const nodes: ElementNode[] = [
      makeNode({
        tagName: 'div',
        attributes: { 'data-v-abc123': '', class: 'wrapper' },
      }),
    ];
    const normalized = normalizeElementTree(nodes);
    expect(normalized[0]!.dynamicAttributes['data-v-abc123']).toBe('');
    expect(normalized[0]!.normalizedAttributes['data-v-abc123']).toBeUndefined();
  });

  it('normalizes timestamp-like attribute values', () => {
    const nodes: ElementNode[] = [
      makeNode({
        tagName: 'div',
        attributes: { 'data-render': '2024-01-15T10:30:00Z' },
      }),
    ];
    const normalized = normalizeElementTree(nodes);
    expect(normalized[0]!.normalizedAttributes['data-render']).toBe('__timestamp__');
  });

  it('builds correct tree paths', () => {
    const nodes: ElementNode[] = [
      makeNode({
        tagName: 'div',
        children: [
          makeNode({ tagName: 'span', children: [makeNode({ tagName: 'a' })] }),
        ],
      }),
    ];
    const normalized = normalizeElementTree(nodes);
    const paths = normalized.map(n => n.path);
    expect(paths).toContain('div');
    expect(paths).toContain('div > span');
    expect(paths).toContain('div > span > a');
  });

  it('flattenToStableMap produces correct mapping', () => {
    const nodes: ElementNode[] = [
      makeNode({ tagName: 'header', children: [makeNode({ tagName: 'nav' })] }),
      makeNode({ tagName: 'main' }),
    ];
    const map = flattenToStableMap(nodes);
    expect(map.has('header')).toBe(true);
    expect(map.has('header > nav')).toBe(true);
    expect(map.has('main')).toBe(true);
    expect(map.size).toBe(3);
  });
});

describe('DOM Comparator', () => {
  it('detects identical trees', () => {
    const before: ElementNode[] = [
      makeNode({ tagName: 'div', children: [makeNode({ tagName: 'span' })] }),
    ];
    const after: ElementNode[] = [
      makeNode({ tagName: 'div', children: [makeNode({ tagName: 'span' })] }),
    ];
    const result = diffTrees(before, after);
    expect(result.structuralSimilarity).toBe(1);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.changed).toHaveLength(0);
  });

  it('detects added nodes', () => {
    const before: ElementNode[] = [
      makeNode({ tagName: 'div' }),
    ];
    const after: ElementNode[] = [
      makeNode({ tagName: 'div' }),
      makeNode({ tagName: 'section' }),
    ];
    const result = diffTrees(before, after);
    expect(result.added.length).toBeGreaterThanOrEqual(1);
    expect(result.added.some(c => c.tagName === 'section')).toBe(true);
  });

  it('detects removed nodes', () => {
    const before: ElementNode[] = [
      makeNode({ tagName: 'div' }),
      makeNode({ tagName: 'aside' }),
    ];
    const after: ElementNode[] = [
      makeNode({ tagName: 'div' }),
    ];
    const result = diffTrees(before, after);
    expect(result.removed.length).toBeGreaterThanOrEqual(1);
  });

  it('detects changed attributes', () => {
    const before: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { class: 'btn old', 'data-testid': 'submit' } }),
    ];
    const after: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { class: 'btn new', 'data-testid': 'submit' } }),
    ];
    const result = diffTrees(before, after);
    expect(result.changed.length).toBeGreaterThanOrEqual(1);
    const change = result.changed.find(c => c.tagName === 'button');
    expect(change).toBeDefined();
    expect(change!.attributeChanges?.some(a => a.name === 'class')).toBe(true);
  });

  it('detects changed text content', () => {
    const before: ElementNode[] = [
      makeNode({ tagName: 'span', textContent: 'Hello', attributes: { 'data-testid': 'msg' } }),
    ];
    const after: ElementNode[] = [
      makeNode({ tagName: 'span', textContent: 'World', attributes: { 'data-testid': 'msg' } }),
    ];
    const result = diffTrees(before, after);
    expect(result.changed.length).toBeGreaterThanOrEqual(1);
    expect(result.changed.some(c => c.textChanged)).toBe(true);
  });

  it('computes structural similarity score', () => {
    const before: ElementNode[] = [
      makeNode({ tagName: 'div', children: [makeNode({ tagName: 'p' }), makeNode({ tagName: 'span' })] }),
    ];
    const after: ElementNode[] = [
      makeNode({ tagName: 'div', children: [makeNode({ tagName: 'p' })] }),
    ];
    const result = diffTrees(before, after);
    expect(result.structuralSimilarity).toBeGreaterThan(0);
    expect(result.structuralSimilarity).toBeLessThan(1);
  });

  it('produces deterministic output for same input', () => {
    const tree: ElementNode[] = [
      makeNode({ tagName: 'nav', children: [makeNode({ tagName: 'ul', children: [makeNode({ tagName: 'li' })] })] }),
    ];
    const r1 = diffTrees(tree, tree);
    const r2 = diffTrees(tree, tree);
    expect(r1.structuralSimilarity).toBe(r2.structuralSimilarity);
    expect(r1.added).toEqual(r2.added);
    expect(r1.removed).toEqual(r2.removed);
    expect(r1.changed).toEqual(r2.changed);
  });

  it('classifies stable elements as unchanged', () => {
    const before: ElementNode[] = [
      makeNode({ tagName: 'header', attributes: { 'data-testid': 'header' } }),
      makeNode({ tagName: 'main', attributes: { 'data-testid': 'main' } }),
    ];
    const after: ElementNode[] = [
      makeNode({ tagName: 'header', attributes: { 'data-testid': 'header' } }),
      makeNode({ tagName: 'main', attributes: { 'data-testid': 'main' } }),
    ];
    const result = diffTrees(before, after);
    expect(result.unchangedPaths.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Locator Survivability', () => {
  const locator: Locator = {
    id: 'loc-1',
    strategy: 'css',
    value: '#submit',
    expression: '#submit',
    sourceFile: 'test.spec.ts',
    sourceLine: 10,
    propertyName: null,
    verified: false,
  };

  it('detects element still exists', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'submit', 'data-testid': 'submit-btn' } }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'submit', 'data-testid': 'submit-btn' } }),
    ];
    const result = analyzeLocatorSurvivability(locator, originalDom, currentDom);
    expect(result.exists).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('detects element missing', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { id: 'submit' } }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'div' }),
    ];
    const result = analyzeLocatorSurvivability(locator, originalDom, currentDom);
    expect(result.exists).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('detects moved elements', () => {
    const originalDom: ElementNode[] = [
      makeNode({
        tagName: 'div', attributes: { 'data-testid': 'container' },
        children: [makeNode({ tagName: 'button', attributes: { id: 'submit' } })],
      }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({
        tagName: 'section', attributes: { 'data-testid': 'new-container' },
        children: [makeNode({ tagName: 'button', attributes: { id: 'submit' } })],
      }),
    ];
    const result = analyzeLocatorSurvivability(
      { ...locator, value: '#submit' },
      originalDom,
      currentDom,
    );
    expect(result.exists).toBe(true);
  });

  it('detects renamed attributes', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { class: 'btn-old', id: 'submit', 'data-testid': 'sb' } }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { class: 'btn-new', id: 'submit', 'data-testid': 'sb' } }),
    ];
    const result = analyzeLocatorSurvivability(locator, originalDom, currentDom);
    expect(result.exists).toBe(true);
    expect(result.attributesRenamed.length).toBeGreaterThanOrEqual(1);
    expect(result.attributesRenamed.some(a => a.name === 'class')).toBe(true);
  });

  it('detects hierarchy changes', () => {
    const originalDom: ElementNode[] = [
      makeNode({
        tagName: 'div',
        children: [
          makeNode({
            tagName: 'nav',
            children: [makeNode({ tagName: 'button', attributes: { id: 'submit' } })],
          }),
        ],
      }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({
        tagName: 'div',
        children: [
          makeNode({
            tagName: 'section',
            children: [makeNode({ tagName: 'button', attributes: { id: 'submit' } })],
          }),
        ],
      }),
    ];
    const result = analyzeLocatorSurvivability(locator, originalDom, currentDom);
    expect(result.exists).toBe(true);
  });

  it('reports partial match confidence appropriately', () => {
    const originalDom: ElementNode[] = [
      makeNode({
        tagName: 'button',
        attributes: { id: 'old-id', 'data-testid': 'unique-btn', class: 'primary' },
        textContent: 'Click me',
      }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({
        tagName: 'button',
        attributes: { id: 'new-id', 'data-testid': 'unique-btn', class: 'secondary' },
        textContent: 'Click me',
      }),
    ];
    const result = analyzeLocatorSurvivability(
      { ...locator, value: '#old-id' },
      originalDom,
      currentDom,
    );
    expect(result.exists).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThan(1);
  });
});

describe('Similarity Scoring', () => {
  it('returns 1 for identical trees', () => {
    const tree: ElementNode[] = [
      makeNode({ tagName: 'div', children: [makeNode({ tagName: 'p', textContent: 'text' })] }),
    ];
    const metrics = computeSimilarity(tree, tree);
    expect(metrics.overall).toBe(1);
    expect(metrics.structural).toBe(1);
  });

  it('returns lower score for different trees', () => {
    const before: ElementNode[] = [
      makeNode({ tagName: 'div', children: [makeNode({ tagName: 'p', textContent: 'hello' })] }),
    ];
    const after: ElementNode[] = [
      makeNode({ tagName: 'section', children: [makeNode({ tagName: 'span', textContent: 'world' })] }),
    ];
    const metrics = computeSimilarity(before, after);
    expect(metrics.overall).toBeLessThan(0.8);
  });

  it('computes node count ratio correctly', () => {
    const few: ElementNode[] = [makeNode({ tagName: 'div' })];
    const many: ElementNode[] = [
      makeNode({ tagName: 'div' }),
      makeNode({ tagName: 'section' }),
      makeNode({ tagName: 'article' }),
    ];
    const metrics = computeSimilarity(few, many);
    expect(metrics.nodeCountRatio).toBeCloseTo(1 / 3, 2);
  });

  it('is reproducible for same input', () => {
    const treeA: ElementNode[] = [
      makeNode({ tagName: 'nav', children: [makeNode({ tagName: 'ul', children: [makeNode({ tagName: 'li' })] })] }),
    ];
    const treeB: ElementNode[] = [
      makeNode({ tagName: 'nav', children: [makeNode({ tagName: 'ul' })] }),
    ];
    const r1 = computeSimilarity(treeA, treeB);
    const r2 = computeSimilarity(treeA, treeB);
    expect(r1.overall).toBe(r2.overall);
    expect(r1.structural).toBe(r2.structural);
    expect(r1.attribute).toBe(r2.attribute);
  });

  it('handles empty trees', () => {
    const metrics = computeSimilarity([], []);
    expect(metrics.overall).toBe(1);
    expect(metrics.nodeCountRatio).toBe(1);
  });

  it('computes accessibility similarity', () => {
    const before: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'aria-label': 'Submit', role: 'button' } }),
    ];
    const after: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { 'aria-label': 'Submit', role: 'button' } }),
    ];
    const metrics = computeSimilarity(before, after);
    expect(metrics.accessibility).toBe(1);
  });

  it('produces all metrics in valid range', () => {
    const before: ElementNode[] = [
      makeNode({ tagName: 'div', attributes: { class: 'a' } }),
    ];
    const after: ElementNode[] = [
      makeNode({ tagName: 'div', attributes: { class: 'b' } }),
    ];
    const metrics = computeSimilarity(before, after);
    const allMetrics = [
      metrics.overall, metrics.structural, metrics.attribute,
      metrics.text, metrics.accessibility, metrics.nodeCountRatio,
    ];
    for (const m of allMetrics) {
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(1);
    }
  });
});

describe('Malformed DOM handling', () => {
  it('handles nodes with missing attributes', () => {
    const nodes: ElementNode[] = [
      makeNode({ tagName: 'div', attributes: undefined as unknown as Record<string, string> }),
    ];
    expect(() => normalizeElementTree(nodes)).not.toThrow();
  });

  it('handles deeply nested trees without stack overflow', () => {
    let node: ElementNode = makeNode({ tagName: 'leaf' });
    for (let i = 0; i < 500; i++) {
      node = makeNode({ tagName: 'wrapper', children: [node] });
    }
    const normalized = normalizeElementTree([node]);
    expect(normalized.length).toBe(501);
  });

  it('handles nodes with empty children arrays', () => {
    const nodes: ElementNode[] = [
      makeNode({ tagName: 'div', children: [] }),
    ];
    const result = diffTrees(nodes, nodes);
    expect(result.structuralSimilarity).toBe(1);
  });

  it('handles nodes with very long text content', () => {
    const longText = 'x'.repeat(10000);
    const nodes: ElementNode[] = [
      makeNode({ tagName: 'p', textContent: longText }),
    ];
    const normalized = normalizeElementTree(nodes);
    expect(normalized[0]!.normalizedText.length).toBe(10000);
  });
});

describe('Normalizer edge cases', () => {
  it('sorts stable class names deterministically', () => {
    const nodes: ElementNode[] = [
      makeNode({ tagName: 'div', attributes: { class: 'z-class secondary primary' } }),
    ];
    const normalized = normalizeElementTree(nodes);
    expect(normalized[0]!.normalizedAttributes['class']).toBe('primary secondary');
  });

  it('preserves role attribute in stable attributes', () => {
    const nodes: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { role: 'button' } }),
    ];
    const normalized = normalizeElementTree(nodes);
    expect(normalized[0]!.stableAttributes['role']).toBe('button');
  });

  it('handles nodes with no text content', () => {
    const nodes: ElementNode[] = [
      makeNode({ tagName: 'br' }),
    ];
    const normalized = normalizeElementTree(nodes);
    expect(normalized[0]!.normalizedText).toBe('');
  });

  it('handles empty attribute values', () => {
    const nodes: ElementNode[] = [
      makeNode({ tagName: 'div', attributes: { class: '', id: '' } }),
    ];
    const normalized = normalizeElementTree(nodes);
    // Empty values should not appear in normalized attributes
    expect(normalized[0]!.normalizedAttributes['class']).toBeUndefined();
    expect(normalized[0]!.normalizedAttributes['id']).toBeUndefined();
  });
});

describe('Comparator edge cases', () => {
  it('detects nodes moved via stable attribute matching', () => {
    const before: ElementNode[] = [
      makeNode({ tagName: 'div', attributes: { 'data-testid': 'moved' } }),
    ];
    const after: ElementNode[] = [
      makeNode({
        tagName: 'section',
        children: [makeNode({ tagName: 'div', attributes: { 'data-testid': 'moved' } })],
      }),
    ];
    const result = diffTrees(before, after);
    // The original div is in a different parent — it may be marked changed or remained
    expect(result.structuralSimilarity).toBeLessThan(1);
  });

  it('classifies same structure as unchanged', () => {
    const tree: ElementNode[] = [
      makeNode({
        tagName: 'form',
        children: [
          makeNode({ tagName: 'input', attributes: { name: 'email' } }),
          makeNode({ tagName: 'button', attributes: { type: 'submit' } }),
        ],
      }),
    ];
    const result = diffTrees(tree, tree);
    expect(result.unchangedPaths.length).toBeGreaterThan(0);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
  });
});

describe('Survivability edge cases', () => {
  it('handles locator with no matching element in original DOM', () => {
    const originalDom: ElementNode[] = [makeNode({ tagName: 'div' })];
    const currentDom: ElementNode[] = [makeNode({ tagName: 'div' })];
    const loc: Locator = {
      id: 'missing', strategy: 'css', value: '#nonexistent',
      expression: '#nonexistent', sourceFile: '', sourceLine: 0,
      propertyName: null, verified: false,
    };
    const result = analyzeLocatorSurvivability(loc, originalDom, currentDom);
    expect(result.exists).toBe(false);
    expect(result.confidence).toBe(0);
  });

  it('handles empty DOM trees', () => {
    const loc: Locator = {
      id: 'loc-1', strategy: 'css', value: '#btn',
      expression: '#btn', sourceFile: '', sourceLine: 0,
      propertyName: null, verified: false,
    };
    const result = analyzeLocatorSurvivability(loc, [], []);
    expect(result.exists).toBe(false);
  });

  it('matches locator by text content', () => {
    const originalDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { class: 'btn', id: 's1' }, textContent: 'Click me' }),
    ];
    const currentDom: ElementNode[] = [
      makeNode({ tagName: 'button', attributes: { class: 'btn-new', id: 's2' }, textContent: 'Click me' }),
    ];
    const loc: Locator = {
      id: 'loc-text', strategy: 'text', value: 'Click me',
      expression: 'text=Click me', sourceFile: '', sourceLine: 0,
      propertyName: null, verified: false,
    };
    const result = analyzeLocatorSurvivability(loc, originalDom, currentDom);
    // Text match should find it despite different id/class
    expect(result.exists).toBe(true);
  });
});
