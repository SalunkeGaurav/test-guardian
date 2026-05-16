/**
 * DOM Comparator
 *
 * Diffs two ElementNode trees and produces a deterministic DomComparisonResult.
 *
 * Algorithm:
 * 1. Normalize both trees
 * 2. Walk both trees and match nodes by stable attributes (testid, aria-label, role, id)
 * 3. Classify nodes as added, removed, unchanged, or changed
 * 4. Classify attribute/text changes
 * 5. Compute structural similarity score
 *
 * Pure function — no I/O, no side effects, no randomness.
 */

import type { ElementNode } from '../../models/snapshot.js';
import type {
  DomComparisonResult,
  StructuralChange,
  AttributeChange,
  NormalizedElement,
} from '../../models/dom-intelligence.js';
import { normalizeElementTree, flattenToStableMap } from './normalizer.js';

const STABLE_MATCH_ATTRS = ['data-testid', 'data-test-id', 'aria-label', 'aria-labelledby', 'role', 'name', 'id'];

function exactMatch(a: NormalizedElement, b: NormalizedElement): boolean {
  if (a.tagName !== b.tagName) return false;
  if (a.path === b.path) return true;
  return false;
}

function stableAttributeMatch(a: NormalizedElement, b: NormalizedElement): boolean {
  for (const attr of STABLE_MATCH_ATTRS) {
    const aVal = a.stableAttributes[attr];
    const bVal = b.stableAttributes[attr];
    if (aVal && bVal && aVal === bVal) return true;
  }
  return false;
}

function getNodeFingerprint(el: NormalizedElement): string {
  const parts: string[] = [el.tagName];
  for (const attr of STABLE_MATCH_ATTRS) {
    const val = el.stableAttributes[attr];
    if (val) parts.push(`${attr}=${val}`);
  }
  parts.push(`depth=${el.depth}`);
  parts.push(`children=${el.childCount}`);
  return parts.join('|');
}

function buildFingerprintIndex(nodes: NormalizedElement[]): Map<string, NormalizedElement[]> {
  const index = new Map<string, NormalizedElement[]>();
  for (const node of nodes) {
    const fp = getNodeFingerprint(node);
    const existing = index.get(fp) ?? [];
    existing.push(node);
    index.set(fp, existing);
  }
  return index;
}

function compareAttributes(
  aAttrs: Record<string, string>,
  bAttrs: Record<string, string>,
): AttributeChange[] {
  const allKeys = new Set([...Object.keys(aAttrs), ...Object.keys(bAttrs)]);
  const changes: AttributeChange[] = [];

  for (const key of allKeys) {
    const aVal = aAttrs[key];
    const bVal = bAttrs[key];
    if (aVal !== bVal) {
      changes.push({ name: key, before: aVal, after: bVal });
    }
  }

  return changes.sort((a, b) => a.name.localeCompare(b.name));
}

function textChanged(a: NormalizedElement, b: NormalizedElement): boolean {
  return a.normalizedText !== b.normalizedText;
}

export function diffTrees(
  beforeNodes: ElementNode[],
  afterNodes: ElementNode[],
): DomComparisonResult {
  const before = normalizeElementTree(beforeNodes);
  const after = normalizeElementTree(afterNodes);

  const beforeMap = new Map(before.map(n => [n.path, n]));
  const afterMap = new Map(after.map(n => [n.path, n]));

  const beforeFP = buildFingerprintIndex(before);
  const afterFP = buildFingerprintIndex(after);

  const added: StructuralChange[] = [];
  const removed: StructuralChange[] = [];
  const changed: StructuralChange[] = [];
  const unchangedPaths: string[] = [];

  // Find removed and changed nodes
  for (const [path, aNode] of beforeMap) {
    const bNode = afterMap.get(path);

    if (!bNode) {
      // Try to find by stable attribute match
      const found = findBestMatch(aNode, after);
      if (found) {
        // Node may have moved
        const attrChanges = compareAttributes(aNode.normalizedAttributes, found.normalizedAttributes);
        const txtChanged = textChanged(aNode, found);
        if (attrChanges.length > 0 || txtChanged) {
          changed.push({
            type: 'changed',
            path: path,
            tagName: aNode.tagName,
            before: aNode.normalizedAttributes,
            after: found.normalizedAttributes,
            textChanged: txtChanged,
            attributeChanges: attrChanges,
          });
        } else {
          unchangedPaths.push(path);
        }
      } else {
        removed.push({
          type: 'removed',
          path,
          tagName: aNode.tagName,
          before: aNode.normalizedAttributes,
        });
      }
      continue;
    }

    // Same path exists
    if (exactMatch(aNode, bNode)) {
      const attrChanges = compareAttributes(aNode.normalizedAttributes, bNode.normalizedAttributes);
      const txtChanged = textChanged(aNode, bNode);

      if (attrChanges.length > 0 || txtChanged) {
        changed.push({
          type: 'changed',
          path,
          tagName: aNode.tagName,
          before: aNode.normalizedAttributes,
          after: bNode.normalizedAttributes,
          textChanged: txtChanged,
          attributeChanges: attrChanges,
        });
      } else {
        unchangedPaths.push(path);
      }
    }
  }

  // Find added nodes
  for (const [path, bNode] of afterMap) {
    if (!beforeMap.has(path)) {
      const found = findBestMatch(bNode, before);
      if (!found) {
        added.push({
          type: 'added',
          path,
          tagName: bNode.tagName,
          after: bNode.normalizedAttributes,
        });
      }
    }
  }

  // Classify truly removed (also check fingerprint index for moved detection)
  const trulyRemoved: StructuralChange[] = [];
  for (const r of removed) {
    const fp = getNodeFingerprint(beforeMap.get(r.path)!);
    const afterMatches = afterFP.get(fp);
    if (!afterMatches || afterMatches.length === 0) {
      trulyRemoved.push(r);
    }
  }

  // Compute structural similarity
  const totalPaths = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const totalCount = totalPaths.size || 1;
  const unchangedCount = unchangedPaths.length;
  const changedCount = changed.length;
  const structuralSimilarity = totalCount > 0
    ? Math.round(((unchangedCount) / totalCount) * 10000) / 10000
    : 1;

  return {
    snapshotA: '',
    snapshotB: '',
    timestamp: Date.now(),
    structuralSimilarity: Math.min(1, Math.max(0, structuralSimilarity)),
    added: sortChanges(added),
    removed: sortChanges(trulyRemoved),
    changed: sortChanges(changed),
    unchangedPaths: unchangedPaths.sort(),
  };
}

function findBestMatch(
  node: NormalizedElement,
  candidates: NormalizedElement[],
): NormalizedElement | undefined {
  // First try stable attribute match
  for (const c of candidates) {
    if (stableAttributeMatch(node, c)) return c;
  }
  // Then try fingerprint match
  const fp = getNodeFingerprint(node);
  const fpMatch = candidates.filter(c => getNodeFingerprint(c) === fp);
  if (fpMatch.length === 1) return fpMatch[0];
  return undefined;
}

function sortChanges(changes: StructuralChange[]): StructuralChange[] {
  return [...changes].sort((a, b) => a.path.localeCompare(b.path));
}
