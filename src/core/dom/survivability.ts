/**
 * Locator Survivability Analysis
 *
 * For a historical locator and a new DOM tree, determines:
 * - whether the target element still exists
 * - whether it moved in the tree
 * - whether attributes were renamed
 * - whether the hierarchy changed
 * - partial match confidence
 *
 * All analysis is deterministic. No AI, no embeddings, no browser.
 */

import type { ElementNode } from '../../models/snapshot.js';
import type { Locator } from '../../models/locator.js';
import type { LocatorSurvivabilityResult, NormalizedElement, AttributeChange } from '../../models/dom-intelligence.js';
import { normalizeElementTree, normalizeElementNode } from './normalizer.js';

interface MatchResult {
  exact: NormalizedElement | undefined;
  tagMatch: NormalizedElement[];
  stableAttrMatch: NormalizedElement[];
  textMatch: NormalizedElement[];
}

function buildPath(target: NormalizedElement): string {
  return target.path;
}

function matchByTagAndText(
  target: NormalizedElement,
  candidates: NormalizedElement[],
): NormalizedElement[] {
  return candidates.filter(c =>
    c.tagName === target.tagName &&
    c.normalizedText === target.normalizedText &&
    c.normalizedText.length > 0,
  );
}

function matchByStableAttrs(
  target: NormalizedElement,
  candidates: NormalizedElement[],
): NormalizedElement[] {
  return candidates.filter(c => {
    for (const key of Object.keys(target.stableAttributes)) {
      if (target.stableAttributes[key] && c.stableAttributes[key] === target.stableAttributes[key]) {
        return true;
      }
    }
    return false;
  });
}

function findNodeFromLocator(
  locator: Locator,
  nodes: ElementNode[],
): NormalizedElement | undefined {
  const normalized = normalizeElementTree(nodes);
  const value = locator.value.toLowerCase();

  // Try exact match by locator value
  for (const n of normalized) {
    if (n.tagName === value) return n;
    if (n.normalizedAttributes.id === value.replace(/^#/, '')) return n;
    if (Object.values(n.normalizedAttributes).some(v => v.toLowerCase().includes(value))) return n;
    if (n.normalizedText.toLowerCase().includes(value)) return n;
    if (n.stableAttributes['data-testid'] === value) return n;
    if (n.stableAttributes['aria-label'] === value) return n;
    if (n.stableAttributes['name'] === value) return n;
  }

  // Fallback to first element matching tag if locator looks like CSS
  if (value.startsWith('#') || value.startsWith('.')) {
    const bareValue = value.replace(/^[#.]/, '');
    for (const n of normalized) {
      if (n.normalizedAttributes.id === bareValue) return n;
      const classes = (n.original.attributes['class'] ?? '').split(/\s+/);
      if (classes.includes(bareValue)) return n;
      if (n.stableAttributes['data-testid'] === bareValue) return n;
      if (n.stableAttributes['aria-label'] === bareValue) return n;
      if (n.stableAttributes['name'] === bareValue) return n;
    }
  }

  return undefined;
}

function detectMoved(
  original: NormalizedElement,
  matched: NormalizedElement,
  allAfter: NormalizedElement[],
): boolean {
  const origParentPath = original.path.split(' > ').slice(0, -1).join(' > ');
  const matchedParentPath = matched.path.split(' > ').slice(0, -1).join(' > ');
  return origParentPath !== matchedParentPath;
}

function detectAttributeChanges(
  original: NormalizedElement,
  matched: NormalizedElement,
): AttributeChange[] {
  const changes: AttributeChange[] = [];
  const allKeys = new Set([
    ...Object.keys(original.normalizedAttributes),
    ...Object.keys(matched.normalizedAttributes),
  ]);

  for (const key of allKeys) {
    const aVal = original.normalizedAttributes[key];
    const bVal = matched.normalizedAttributes[key];
    if (aVal !== bVal) {
      changes.push({ name: key, before: aVal, after: bVal });
    }
  }

  return changes.sort((a, b) => a.name.localeCompare(b.name));
}

function detectHierarchyChange(
  original: NormalizedElement,
  matched: NormalizedElement,
): boolean {
  const origDepth = original.path.split(' > ').length;
  const matchedDepth = matched.path.split(' > ').length;
  return origDepth !== matchedDepth;
}

function computeConfidence(
  exact: boolean,
  moved: boolean,
  attrChanges: AttributeChange[],
  hierarchyChanged: boolean,
  partialMatch: boolean,
): number {
  let score = 0;

  if (exact) score += 0.6;
  else if (partialMatch) score += 0.3;

  if (!moved) score += 0.15;
  else score += 0.05;

  if (attrChanges.length === 0) score += 0.15;
  else score += Math.max(0, 0.15 - (attrChanges.length * 0.03));

  if (!hierarchyChanged) score += 0.1;
  else score += 0.02;

  return Math.round(Math.min(1, Math.max(0, score)) * 10000) / 10000;
}

export function analyzeLocatorSurvivability(
  locator: Locator,
  originalDom: ElementNode[],
  currentDom: ElementNode[],
): LocatorSurvivabilityResult {
  const allAfter = normalizeElementTree(currentDom);
  const target = findNodeFromLocator(locator, originalDom);

  if (!target) {
    return {
      locatorId: locator.id,
      strategy: locator.strategy,
      value: locator.value,
      exists: false,
      moved: false,
      attributesRenamed: [],
      hierarchyChanged: false,
      partialMatch: false,
      confidence: 0,
    };
  }

  // Find exact match in current DOM
  const currentNormalized = normalizeElementTree(currentDom);
  let exactMatch: NormalizedElement | undefined;
  let stableMatch: NormalizedElement | undefined;
  let textTagMatch: NormalizedElement | undefined;

  // Try exact path match
  exactMatch = currentNormalized.find(n => n.path === target.path && n.tagName === target.tagName);

  // Try stable attribute match
  if (!exactMatch) {
    stableMatch = currentNormalized.find(n => {
      for (const key of Object.keys(target.stableAttributes)) {
        if (target.stableAttributes[key] && n.stableAttributes[key] === target.stableAttributes[key]) {
          return true;
        }
      }
      return false;
    });
  }

  // Try text + tag match
  const textTagMatches = matchByTagAndText(target, currentNormalized);
  if (!exactMatch && !stableMatch && textTagMatches.length > 0) {
    textTagMatch = textTagMatches[0];
  }

  const matched = exactMatch ?? stableMatch ?? textTagMatch;
  const exists = !!matched;
  const isExact = !!exactMatch;
  const isPartial = !isExact && !!matched;

  if (!matched) {
    return {
      locatorId: locator.id,
      strategy: locator.strategy,
      value: locator.value,
      exists: false,
      moved: false,
      attributesRenamed: [],
      hierarchyChanged: false,
      partialMatch: false,
      confidence: 0,
    };
  }

  const moved = detectMoved(target, matched, allAfter);
  const attrChanges = detectAttributeChanges(target, matched);
  const hierarchyChanged = detectHierarchyChange(target, matched);
  const confidence = computeConfidence(isExact, moved, attrChanges, hierarchyChanged, isPartial);

  return {
    locatorId: locator.id,
    strategy: locator.strategy,
    value: locator.value,
    exists,
    moved,
    attributesRenamed: attrChanges,
    hierarchyChanged,
    partialMatch: isPartial,
    confidence,
    matchedNode: {
      path: matched.path,
      tagName: matched.tagName,
      attributes: { ...matched.normalizedAttributes, ...matched.stableAttributes },
      textContent: matched.normalizedText || undefined,
    },
  };
}
