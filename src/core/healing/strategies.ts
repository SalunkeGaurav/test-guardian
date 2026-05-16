/**
 * Deterministic Healing Strategies
 *
 * Each strategy is a pure function that takes the failing locator,
 * its original DOM context, and the current DOM, and returns zero
 * or more candidate repair expressions.
 *
 * Strategies:
 * - attribute-similarity: find elements sharing stable attrs with the target
 * - structural-proximity: find elements near the target's original position
 * - hierarchy-matching: match by parent-child structural pattern
 * - sibling-relationship: match by sibling tag pattern
 * - text-proximity: find elements with similar text content
 * - accessibility-metadata: match by aria/role attributes
 * - historical-selector-evolution: derive from locator history patterns
 *
 * All strategies are deterministic. No AI. No embeddings.
 */

import type { ElementNode } from '../../models/snapshot.js';
import type { Locator } from '../../models/locator.js';
import type { NormalizedElement } from '../../models/dom-intelligence.js';
import type { CandidateStrategy, HealingCandidate } from '../../models/healing-candidate.js';
import { normalizeElementTree, normalizeAttributeValue } from '../dom/normalizer.js';

const STABLE_MATCH_ATTRS = ['data-testid', 'data-test-id', 'aria-label', 'aria-labelledby', 'role', 'name'];

interface StrategyInput {
  locator: Locator;
  originalDom: ElementNode[];
  currentDom: ElementNode[];
  normalizedOriginal: NormalizedElement[];
  normalizedCurrent: NormalizedElement[];
}

interface StrategyCandidate {
  expression: string;
  strategy: string;
  value: string;
  confidence: number;
  matchedNode: NormalizedElement;
  matchingAttrs: string[];
}

let candidateCounter = 0;
function nextId(): string {
  candidateCounter++;
  return `candidate-${Date.now()}-${candidateCounter}`;
}

function findTargetInOriginal(
  locator: Locator,
  normalized: NormalizedElement[],
): NormalizedElement | undefined {
  const value = locator.value.toLowerCase();
  for (const n of normalized) {
    if (n.tagName === value) return n;
    if (n.normalizedAttributes.id === value.replace(/^#/, '')) return n;
    if (n.stableAttributes['data-testid'] === value) return n;
    if (n.stableAttributes['aria-label'] === value) return n;
    if (n.stableAttributes['name'] === value) return n;
    if (n.normalizedText.toLowerCase().includes(value)) return n;
  }
  if (value.startsWith('#') || value.startsWith('.')) {
    const bare = value.replace(/^[#.]/, '');
    for (const n of normalized) {
      if (n.normalizedAttributes.id === bare) return n;
      const classes = (n.original.attributes['class'] ?? '').split(/\s+/);
      if (classes.includes(bare)) return n;
    }
  }
  return undefined;
}

function buildExpression(strategy: string, value: string, node: NormalizedElement): string {
  switch (strategy) {
    case 'id': return `#${value}`;
    case 'testid': return `[data-testid="${value}"]`;
    case 'aria-label': return `[aria-label="${value}"]`;
    case 'role': return `[role="${value}"]`;
    case 'name': return `[name="${value}"]`;
    case 'text': return `text="${value}"`;
    case 'placeholder': return `[placeholder="${value}"]`;
    case 'class-name': return `.${value}`;
    case 'tag': return node.tagName;
    case 'css': return value;
    default: return value;
  }
}

function makeCandidate(
  locator: Locator,
  matched: NormalizedElement,
  strategy: CandidateStrategy,
  expression: string,
  proposedStrategy: string,
  proposedValue: string,
  confidence: number,
  matchingAttrs: string[],
): HealingCandidate {
  return {
    id: nextId(),
    locatorId: locator.id,
    originalExpression: locator.expression,
    proposedExpression: expression,
    proposedStrategy,
    proposedValue,
    strategy,
    confidence,
    ranking: {
      overall: confidence,
      survivabilityScore: confidence,
      structuralSimilarity: 0,
      attributeMatchScore: 0,
      hierarchyStability: 0,
      replayContextConfidence: 0,
    },
    explanation: {
      whyMatched: `${strategy} strategy: found ${matched.tagName} by ${matchingAttrs.join(', ')}`,
      structuralChanges: [],
      confidenceBreakdown: {
        overall: confidence,
        survivabilityScore: confidence,
        structuralSimilarity: 0,
        attributeMatchScore: 0,
        hierarchyStability: 0,
        replayContextConfidence: 0,
      },
      survivabilityReasoning: `Element matched at path ${matched.path}`,
      attributeChanges: [],
      strategyApplied: strategy,
    },
    domEvidence: {
      matchedPath: matched.path,
      matchedTag: matched.tagName,
      stableAttributeMatches: matchingAttrs,
      textContentMatch: matched.normalizedText || undefined,
    },
    validated: false,
    createdAt: Date.now(),
  };
}

// ─── Strategy 1: Attribute Similarity ───────────────────────────────

function byAttributeSimilarity(input: StrategyInput): StrategyCandidate[] {
  const candidates: StrategyCandidate[] = [];
  const target = findTargetInOriginal(input.locator, input.normalizedOriginal);
  if (!target) return [];

  const stableKeys = Object.keys(target.stableAttributes).filter(k => target.stableAttributes[k]);
  if (stableKeys.length === 0) return [];

  for (const candidate of input.normalizedCurrent) {
    const matchingAttrs: string[] = [];
    let matchScore = 0;

    for (const key of stableKeys) {
      const aVal = target.stableAttributes[key];
      const bVal = candidate.stableAttributes[key];
      if (aVal && aVal === bVal) {
        matchingAttrs.push(key);
        matchScore += 0.3;
      }
    }

    if (matchingAttrs.length === 0) continue;

    // Bonus for same tag
    if (candidate.tagName === target.tagName) matchScore += 0.2;
    // Bonus for partial text overlap
    if (target.normalizedText && candidate.normalizedText &&
        target.normalizedText.includes(candidate.normalizedText)) {
      matchScore += 0.1;
    }

    const confidence = Math.round(Math.min(1, matchScore) * 10000) / 10000;

    // Determine best strategy from matched attrs
    let bestStrategy = 'css';
    let bestValue = candidate.normalizedAttributes['id'] ?? candidate.tagName;
    for (const attr of STABLE_MATCH_ATTRS) {
      if (matchingAttrs.includes(attr) && candidate.stableAttributes[attr]) {
        bestStrategy = attr === 'data-testid' || attr === 'data-test-id' ? 'testid' : attr;
        bestValue = candidate.stableAttributes[attr]!;
        break;
      }
    }

    const expression = buildExpression(bestStrategy, bestValue, candidate);
    candidates.push({ expression, strategy: bestStrategy, value: bestValue, confidence, matchedNode: candidate, matchingAttrs });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

// ─── Strategy 2: Structural Proximity ───────────────────────────────

function byStructuralProximity(input: StrategyInput): StrategyCandidate[] {
  const target = findTargetInOriginal(input.locator, input.normalizedOriginal);
  if (!target) return [];

  const targetPathParts = target.path.split(' > ');
  const parentPath = targetPathParts.slice(0, -1).join(' > ');
  const candidates: StrategyCandidate[] = [];

  // Find candidates at same depth with same tag in the same parent
  for (const candidate of input.normalizedCurrent) {
    if (candidate.tagName !== target.tagName) continue;

    const candPathParts = candidate.path.split(' > ');
    if (candPathParts.length !== targetPathParts.length) continue;

    const candParentPath = candPathParts.slice(0, -1).join(' > ');
    if (candParentPath !== parentPath) continue;

    let confidence = 0.5; // base for structural match
    if (candidate.normalizedText && target.normalizedText &&
        candidate.normalizedText === target.normalizedText) {
      confidence += 0.2;
    }
    // Check attribute overlap
    const targetAttrKeys = Object.keys(target.normalizedAttributes);
    let attrOverlap = 0;
    for (const key of targetAttrKeys) {
      if (candidate.normalizedAttributes[key] === target.normalizedAttributes[key]) {
        attrOverlap++;
      }
    }
    if (targetAttrKeys.length > 0) {
      confidence += (attrOverlap / targetAttrKeys.length) * 0.15;
    }

    const bestAttr = findBestStableAttr(candidate);
    const expression = bestAttr
      ? buildExpression(bestAttr.strategy, bestAttr.value, candidate)
      : candidate.tagName;
    candidates.push({
      expression,
      strategy: bestAttr?.strategy ?? 'tag',
      value: bestAttr?.value ?? candidate.tagName,
      confidence: Math.round(Math.min(1, confidence) * 10000) / 10000,
      matchedNode: candidate,
      matchingAttrs: bestAttr ? [bestAttr.strategy] : [],
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

// ─── Strategy 3: Hierarchy Matching ─────────────────────────────────

function byHierarchyMatching(input: StrategyInput): StrategyCandidate[] {
  const target = findTargetInOriginal(input.locator, input.normalizedOriginal);
  if (!target) return [];

  const targetPathParts = target.path.split(' > ');
  if (targetPathParts.length < 2) return [];

  // Use the grandparent path as structural signature
  const grandparentPath = targetPathParts.slice(0, -2).join(' > ');
  const expectedTag = targetPathParts[targetPathParts.length - 1]!;

  const candidates: StrategyCandidate[] = [];

  for (const candidate of input.normalizedCurrent) {
    if (candidate.tagName !== expectedTag) continue;
    const candParts = candidate.path.split(' > ');
    if (candParts.length < 2) continue;
    const candGrandparent = candParts.slice(0, -2).join(' > ');
    if (candGrandparent !== grandparentPath) continue;

    const confidence = 0.55;
    const bestAttr = findBestStableAttr(candidate);
    const expression = bestAttr
      ? buildExpression(bestAttr.strategy, bestAttr.value, candidate)
      : candidate.tagName;
    candidates.push({
      expression,
      strategy: bestAttr?.strategy ?? 'tag',
      value: bestAttr?.value ?? candidate.tagName,
      confidence,
      matchedNode: candidate,
      matchingAttrs: [`hierarchy-match:${grandparentPath}`],
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

// ─── Strategy 4: Sibling Relationship ───────────────────────────────

function bySiblingRelationship(input: StrategyInput): StrategyCandidate[] {
  const target = findTargetInOriginal(input.locator, input.normalizedOriginal);
  if (!target) return [];

  const targetPathParts = target.path.split(' > ');
  if (targetPathParts.length < 2) return [];

  const parentPath = targetPathParts.slice(0, -1).join(' > ');
  const expectedTag = targetPathParts[targetPathParts.length - 1]!;

  // Collect sibling tags from original DOM
  const originalSiblings = input.normalizedOriginal
    .filter(n => n.path.startsWith(parentPath) && n.path !== target.path && n.depth === target.depth)
    .map(n => n.tagName);
  const siblingSignature = [...new Set(originalSiblings)].sort().join(',');

  if (!siblingSignature) return [];

  const candidates: StrategyCandidate[] = [];

  for (const candidate of input.normalizedCurrent) {
    if (candidate.tagName !== expectedTag) continue;

    const candParts = candidate.path.split(' > ');
    if (candParts.length < 2) continue;
    const candParentPath = candParts.slice(0, -1).join(' > ');

    // Check current sibling signature
    const currentSiblings = input.normalizedCurrent
      .filter(n => n.path.startsWith(candParentPath) && n.path !== candidate.path && n.depth === candidate.depth)
      .map(n => n.tagName);
    const currentSig = [...new Set(currentSiblings)].sort().join(',');

    if (currentSig !== siblingSignature) continue;

    let confidence = 0.5;
    if (candidate.normalizedText && target.normalizedText &&
        candidate.normalizedText === target.normalizedText) {
      confidence += 0.15;
    }

    const bestAttr = findBestStableAttr(candidate);
    const expression = bestAttr
      ? buildExpression(bestAttr.strategy, bestAttr.value, candidate)
      : candidate.tagName;
    candidates.push({
      expression,
      strategy: bestAttr?.strategy ?? 'tag',
      value: bestAttr?.value ?? candidate.tagName,
      confidence: Math.round(Math.min(1, confidence) * 10000) / 10000,
      matchedNode: candidate,
      matchingAttrs: [`sibling-signature:${siblingSignature}`],
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

// ─── Strategy 5: Text Proximity ─────────────────────────────────────

function byTextProximity(input: StrategyInput): StrategyCandidate[] {
  const target = findTargetInOriginal(input.locator, input.normalizedOriginal);
  if (!target || !target.normalizedText) return [];

  const targetWords = target.normalizedText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (targetWords.length === 0) return [];

  const candidates: StrategyCandidate[] = [];

  for (const candidate of input.normalizedCurrent) {
    if (!candidate.normalizedText) continue;
    if (candidate.tagName !== target.tagName) continue;

    const candText = candidate.normalizedText.toLowerCase();
    let matchCount = 0;
    for (const word of targetWords) {
      if (candText.includes(word)) matchCount++;
    }

    if (matchCount === 0) continue;

    const ratio = matchCount / targetWords.length;
    let confidence = 0.3 + (ratio * 0.4);

    // Bonus if text is exactly the same
    if (candText === target.normalizedText.toLowerCase()) {
      confidence += 0.2;
    }

    const bestAttr = findBestStableAttr(candidate);
    const expression = bestAttr
      ? buildExpression(bestAttr.strategy, bestAttr.value, candidate)
      : `text="${candidate.normalizedText}"`;
    candidates.push({
      expression,
      strategy: bestAttr?.strategy ?? 'text',
      value: bestAttr?.value ?? candidate.normalizedText,
      confidence: Math.round(Math.min(1, confidence) * 10000) / 10000,
      matchedNode: candidate,
      matchingAttrs: [`text-match:${matchCount}/${targetWords.length}`],
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

// ─── Strategy 6: Accessibility Metadata ─────────────────────────────

function byAccessibilityMetadata(input: StrategyInput): StrategyCandidate[] {
  const target = findTargetInOriginal(input.locator, input.normalizedOriginal);
  if (!target) return [];

  const a11yAttrs = Object.keys(target.stableAttributes)
    .filter(k => k.startsWith('aria-') || k === 'role');
  if (a11yAttrs.length === 0) return [];

  const candidates: StrategyCandidate[] = [];

  for (const candidate of input.normalizedCurrent) {
    const matchingA11y: string[] = [];
    for (const attr of a11yAttrs) {
      const aVal = target.stableAttributes[attr];
      const bVal = candidate.stableAttributes[attr];
      if (aVal && aVal === bVal) {
        matchingA11y.push(attr);
      }
    }

    if (matchingA11y.length === 0) continue;

    let confidence = 0.4 + (matchingA11y.length / a11yAttrs.length) * 0.4;
    if (candidate.tagName === target.tagName) confidence += 0.1;
    if (candidate.normalizedText && target.normalizedText &&
        candidate.normalizedText === target.normalizedText) {
      confidence += 0.1;
    }

    // Build expression from the best matching a11y attr
    const bestA11y = matchingA11y[0]!;
    const attrName = bestA11y === 'role' ? 'role' : bestA11y;
    const attrValue = candidate.stableAttributes[bestA11y]!;
    const expression = `[${attrName}="${attrValue}"]`;

    candidates.push({
      expression,
      strategy: bestA11y === 'role' ? 'role' : 'aria-label',
      value: attrValue,
      confidence: Math.round(Math.min(1, confidence) * 10000) / 10000,
      matchedNode: candidate,
      matchingAttrs: matchingA11y,
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

// ─── Strategy 7: Historical Selector Evolution ──────────────────────

function byHistoricalSelectorEvolution(input: StrategyInput): StrategyCandidate[] {
  const target = findTargetInOriginal(input.locator, input.normalizedOriginal);
  if (!target) return [];

  // Derive alternative selectors from the original element's attributes
  const candidates: StrategyCandidate[] = [];
  const attrs = target.stableAttributes;

  // Try data-testid
  if (attrs['data-testid']) {
    candidates.push({
      expression: `[data-testid="${attrs['data-testid']}"]`,
      strategy: 'testid',
      value: attrs['data-testid'],
      confidence: 0.7,
      matchedNode: target,
      matchingAttrs: ['data-testid'],
    });
  }

  // Try aria-label
  if (attrs['aria-label']) {
    candidates.push({
      expression: `[aria-label="${attrs['aria-label']}"]`,
      strategy: 'aria-label',
      value: attrs['aria-label'],
      confidence: 0.65,
      matchedNode: target,
      matchingAttrs: ['aria-label'],
    });
  }

  // Try role
  if (attrs['role']) {
    candidates.push({
      expression: `[role="${attrs['role']}"]`,
      strategy: 'role',
      value: attrs['role'],
      confidence: 0.55,
      matchedNode: target,
      matchingAttrs: ['role'],
    });
  }

  // Try name
  if (attrs['name']) {
    candidates.push({
      expression: `[name="${attrs['name']}"]`,
      strategy: 'name',
      value: attrs['name'],
      confidence: 0.6,
      matchedNode: target,
      matchingAttrs: ['name'],
    });
  }

  // Try placeholder
  if (attrs['placeholder']) {
    candidates.push({
      expression: `[placeholder="${attrs['placeholder']}"]`,
      strategy: 'placeholder',
      value: attrs['placeholder'],
      confidence: 0.5,
      matchedNode: target,
      matchingAttrs: ['placeholder'],
    });
  }

  // Try text content
  if (target.normalizedText) {
    candidates.push({
      expression: `text="${target.normalizedText}"`,
      strategy: 'text',
      value: target.normalizedText,
      confidence: 0.45,
      matchedNode: target,
      matchingAttrs: ['text'],
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

// ─── Helper ──────────────────────────────────────────────────────────

function findBestStableAttr(node: NormalizedElement): { strategy: string; value: string } | undefined {
  for (const attr of STABLE_MATCH_ATTRS) {
    const val = node.stableAttributes[attr];
    if (val) {
      const strategy = attr === 'data-testid' || attr === 'data-test-id' ? 'testid' : attr;
      return { strategy, value: val };
    }
  }
  const id = node.normalizedAttributes['id'];
  if (id) return { strategy: 'id', value: id };
  return undefined;
}

// ─── Public API ──────────────────────────────────────────────────────

export type StrategyFn = (input: StrategyInput) => StrategyCandidate[];

export const STRATEGIES: Record<CandidateStrategy, StrategyFn> = {
  'attribute-similarity': byAttributeSimilarity,
  'structural-proximity': byStructuralProximity,
  'hierarchy-matching': byHierarchyMatching,
  'sibling-relationship': bySiblingRelationship,
  'text-proximity': byTextProximity,
  'accessibility-metadata': byAccessibilityMetadata,
  'historical-selector-evolution': byHistoricalSelectorEvolution,
};

export const STRATEGY_DEFINITIONS: Array<{
  name: CandidateStrategy;
  description: string;
  priority: number;
  minConfidence: number;
}> = [
  { name: 'attribute-similarity', description: 'Match by stable attributes (testid, aria-label, role, name)', priority: 1, minConfidence: 0.3 },
  { name: 'accessibility-metadata', description: 'Match by aria-* and role attributes', priority: 2, minConfidence: 0.3 },
  { name: 'historical-selector-evolution', description: 'Derive alternative selectors from original element attrs', priority: 3, minConfidence: 0.3 },
  { name: 'text-proximity', description: 'Match by text content similarity', priority: 4, minConfidence: 0.25 },
  { name: 'structural-proximity', description: 'Match by same tag at same depth in same parent', priority: 5, minConfidence: 0.25 },
  { name: 'hierarchy-matching', description: 'Match by grandparent structural pattern', priority: 6, minConfidence: 0.2 },
  { name: 'sibling-relationship', description: 'Match by sibling tag signature', priority: 7, minConfidence: 0.2 },
];

export function collectCandidates(
  locator: Locator,
  originalDom: ElementNode[],
  currentDom: ElementNode[],
): HealingCandidate[] {
  const normalizedOriginal = normalizeElementTree(originalDom);
  const normalizedCurrent = normalizeElementTree(currentDom);

  const input: StrategyInput = { locator, originalDom, currentDom, normalizedOriginal, normalizedCurrent };
  const allCandidates: HealingCandidate[] = [];

  for (const def of STRATEGY_DEFINITIONS) {
    const fn = STRATEGIES[def.name];
    if (!fn) continue;

    const raw = fn(input);
    const seen = new Set<string>();
    for (const r of raw) {
      if (r.confidence < def.minConfidence) continue;

      // Deduplicate by expression within each strategy
      const key = r.expression;
      if (seen.has(key)) continue;
      seen.add(key);

      allCandidates.push(makeCandidate(locator, r.matchedNode, def.name, r.expression, r.strategy, r.value, r.confidence, r.matchingAttrs));
    }
  }

  return allCandidates;
}
