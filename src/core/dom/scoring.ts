/**
 * Deterministic Similarity Scoring
 *
 * Computes reproducible similarity metrics between two DOM trees.
 * All scores are 0-1, computed via deterministic weighted comparison.
 *
 * No randomness, no AI, no embeddings.
 *
 * Metrics:
 * - overall: weighted composite of all sub-scores
 * - structural: tree structure similarity (depth, node count, path overlap)
 * - attribute: attribute name/value overlap
 * - text: text content overlap
 * - accessibility: aria-* and role attribute overlap
 * - nodeCountRatio: min/max ratio of node counts
 * - maxDepth: max tree depth of each tree
 */

import type { ElementNode } from '../../models/snapshot.js';
import type { NormalizedElement, SimilarityMetrics } from '../../models/dom-intelligence.js';
import { normalizeElementTree } from './normalizer.js';

interface TokenSet {
  paths: Set<string>;
  tags: Set<string>;
  attributes: Map<string, Set<string>>;
  texts: Set<string>;
  accessibility: Map<string, Set<string>>;
}

function extractTokenSet(elements: NormalizedElement[]): TokenSet {
  const paths = new Set<string>();
  const tags = new Set<string>();
  const attributes = new Map<string, Set<string>>();
  const texts = new Set<string>();
  const accessibility = new Map<string, Set<string>>();

  for (const el of elements) {
    paths.add(el.path);
    tags.add(el.tagName);

    if (el.normalizedText) {
      texts.add(el.normalizedText);
    }

    for (const [key, value] of Object.entries(el.normalizedAttributes)) {
      const existing = attributes.get(key) ?? new Set();
      existing.add(value);
      attributes.set(key, existing);

      if (key.startsWith('aria-') || key === 'role') {
        const accExisting = accessibility.get(key) ?? new Set();
        accExisting.add(value);
        accessibility.set(key, accExisting);
      }
    }
  }

  return { paths, tags, attributes, texts, accessibility };
}

function jaccardSimilarity<T>(a: Set<T>, b: Set<T>): number {
  const union = new Set([...a, ...b]);
  if (union.size === 0) return 1;
  const intersection = new Set([...a].filter(x => b.has(x)));
  return intersection.size / union.size;
}

function attributeSimilarity(
  a: Map<string, Set<string>>,
  b: Map<string, Set<string>>,
): number {
  const allKeys = new Set([...a.keys(), ...b.keys()]);
  if (allKeys.size === 0) return 1;

  let totalScore = 0;
  for (const key of allKeys) {
    const aVals = a.get(key) ?? new Set();
    const bVals = b.get(key) ?? new Set();
    totalScore += jaccardSimilarity(aVals, bVals);
  }

  return totalScore / allKeys.size;
}

function computeMaxDepth(elements: NormalizedElement[]): number {
  if (elements.length === 0) return 0;
  return Math.max(...elements.map(e => e.depth));
}

export function computeSimilarity(
  beforeNodes: ElementNode[],
  afterNodes: ElementNode[],
): SimilarityMetrics {
  const before = normalizeElementTree(beforeNodes);
  const after = normalizeElementTree(afterNodes);

  const beforeTokens = extractTokenSet(before);
  const afterTokens = extractTokenSet(after);

  // Structural similarity: path overlap
  const structural = jaccardSimilarity(beforeTokens.paths, afterTokens.paths);

  // Attribute similarity
  const attribute = attributeSimilarity(beforeTokens.attributes, afterTokens.attributes);

  // Text similarity
  const text = jaccardSimilarity(beforeTokens.texts, afterTokens.texts);

  // Accessibility similarity
  const accessibility = attributeSimilarity(beforeTokens.accessibility, afterTokens.accessibility);

  // Node count ratio
  const beforeCount = before.length;
  const afterCount = after.length;
  const nodeCountRatio = (beforeCount > 0 && afterCount > 0)
    ? Math.min(beforeCount, afterCount) / Math.max(beforeCount, afterCount)
    : (beforeCount === 0 && afterCount === 0) ? 1 : 0;

  // Max depth
  const maxDepth = {
    before: computeMaxDepth(before),
    after: computeMaxDepth(after),
  };

  // Weighted overall score
  const overall = Math.round(
    (structural * 0.35 + attribute * 0.25 + text * 0.15 + accessibility * 0.15 + nodeCountRatio * 0.10) * 10000,
  ) / 10000;

  return {
    overall: Math.min(1, Math.max(0, overall)),
    structural: Math.round(structural * 10000) / 10000,
    attribute: Math.round(attribute * 10000) / 10000,
    text: Math.round(text * 10000) / 10000,
    accessibility: Math.round(accessibility * 10000) / 10000,
    nodeCountRatio: Math.round(nodeCountRatio * 10000) / 10000,
    maxDepth,
  };
}
