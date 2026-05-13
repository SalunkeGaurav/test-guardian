/**
 * Deterministic Validation Scoring
 *
 * Computes a reproducible validation confidence score based on:
 * - Replay success (step originally passed)
 * - Interaction stability (element visible, interactable)
 * - DOM consistency (no false positives)
 * - Structural similarity (element depth/tag consistency)
 * - Locator uniqueness (single unambiguous match)
 *
 * All scores are 0-1 rounded to 4 decimal places.
 * No AI. No randomness. Fully deterministic.
 */

import type { ElementNode } from '../../models/snapshot.js';
import type { FalsePositiveIndicator } from '../../models/validation.js';

export interface ScoringInput {
  matches: ElementNode[];
  falsePositives: FalsePositiveIndicator[];
  interactionSuccess: boolean;
  stepSuccessful: boolean;
  expectedTag?: string;
  expectedDepth?: number;
  actualDepth?: number;
}

/**
 * Compute deterministic validation confidence score.
 *
 * Weights:
 * - Replay success: 20%
 * - Interaction stability: 25%
 * - DOM consistency (false-positive free): 25%
 * - Structural similarity: 15%
 * - Locator uniqueness: 15%
 */
export function computeValidationConfidence(input: ScoringInput): number {
  if (input.matches.length === 0) return 0;

  const replayScore = computeReplaySuccess(input.stepSuccessful);
  const interactionScore = computeInteractionStability(input.interactionSuccess, input.falsePositives);
  const consistencyScore = computeDomConsistency(input.falsePositives);
  const structuralScore = computeStructuralSimilarity(input.expectedTag, input.expectedDepth, input.actualDepth);
  const uniquenessScore = computeLocatorUniqueness(input.matches, input.falsePositives);

  const total =
    replayScore * 0.20 +
    interactionScore * 0.25 +
    consistencyScore * 0.25 +
    structuralScore * 0.15 +
    uniquenessScore * 0.15;

  return round(total);
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function computeReplaySuccess(stepSuccessful: boolean): number {
  return stepSuccessful ? 1 : 0.3;
}

function computeInteractionStability(
  interactionSuccess: boolean,
  falsePositives: FalsePositiveIndicator[],
): number {
  if (!interactionSuccess) return 0;

  const hasInteractabilityIssue = falsePositives.some(
    fp => fp.type === 'not-interactable' || fp.type === 'hidden-element',
  );
  if (hasInteractabilityIssue) return 0.3;

  return 1;
}

function computeDomConsistency(falsePositives: FalsePositiveIndicator[]): number {
  if (falsePositives.length === 0) return 1;

  // Each false positive reduces consistency
  let score = 1;
  for (const fp of falsePositives) {
    switch (fp.type) {
      case 'no-match':
        score -= 0.5;
        break;
      case 'multiple-matches':
        score -= 0.3;
        break;
      case 'hidden-element':
        score -= 0.25;
        break;
      case 'wrong-role':
        score -= 0.2;
        break;
      case 'hierarchy-mismatch':
        score -= 0.15;
        break;
      case 'unstable-dynamic':
        score -= 0.15;
        break;
      case 'not-interactable':
        score -= 0.2;
        break;
      default:
        score -= 0.1;
    }
  }

  return round(Math.max(0, score));
}

function computeStructuralSimilarity(
  expectedTag?: string,
  expectedDepth?: number,
  actualDepth?: number,
): number {
  let score = 0.5;

  if (expectedTag) score += 0.25;
  if (expectedDepth !== undefined && actualDepth !== undefined) {
    if (expectedDepth === actualDepth) {
      score += 0.25;
    } else {
      score += 0.1;
    }
  }

  return round(Math.min(1, score));
}

function computeLocatorUniqueness(
  matches: ElementNode[],
  falsePositives: FalsePositiveIndicator[],
): number {
  if (matches.length === 0) return 0;
  if (matches.length === 1) return 1;

  const hasMultiple = falsePositives.some(fp => fp.type === 'multiple-matches');
  if (hasMultiple) return 0.3;

  // More matches = lower uniqueness
  return round(Math.max(0, 1 - (matches.length - 1) * 0.2));
}

/**
 * Determine the overall validation status.
 */
export function determineStatus(
  matches: ElementNode[],
  falsePositives: FalsePositiveIndicator[],
  interactionSuccess: boolean,
): 'passed' | 'failed' | 'ambiguous' {
  if (matches.length === 0) return 'failed';

  const hasMultiple = falsePositives.some(fp => fp.type === 'multiple-matches');
  const hasFatal = falsePositives.some(
    fp => fp.type === 'no-match' || fp.type === 'hidden-element' || fp.type === 'not-interactable',
  );
  const hasWarnings = falsePositives.some(fp => fp.type === 'unstable-dynamic');

  if (hasMultiple && !hasFatal) return 'ambiguous';
  if (hasFatal) return 'failed';
  if (!interactionSuccess) return 'failed';
  if (hasWarnings) return 'ambiguous';

  return 'passed';
}

/**
 * Evaluate whether the matched elements support the intended interaction.
 */
export function evaluateInteractionSuccess(
  matches: ElementNode[],
  actionType: string,
): { success: boolean; reason?: string } {
  if (matches.length === 0) {
    return { success: false, reason: 'No elements matched the locator' };
  }

  if (matches.length > 1) {
    return { success: false, reason: `Multiple matches (${matches.length}) — ambiguous` };
  }

  const node = matches[0]!;
  const tag = node.tagName.toLowerCase();
  const attrs = node.attributes ?? {};

  // Check visibility
  if (node.visible === false) {
    return { success: false, reason: 'Element is not visible' };
  }

  // Check disabled
  if (attrs['disabled'] !== undefined) {
    return { success: false, reason: 'Element is disabled' };
  }

  // Check interactivity by action type
  switch (actionType) {
    case 'click':
      return { success: true };
    case 'fill': {
      if (tag === 'input' || tag === 'textarea' || attrs['contenteditable'] === 'true') {
        return { success: true };
      }
      return { success: false, reason: `Element <${tag}> is not fillable` };
    }
    case 'press':
      return { success: true };
    case 'wait':
      return { success: true };
    default:
      return { success: true };
  }
}

/**
 * Compute depth of an element in the DOM tree.
 */
export function computeElementDepth(node: ElementNode, dom: ElementNode[], depth = 0): number {
  for (const root of dom) {
    if (root === node) return depth;
    const found = findInChildren(root, node, depth + 1);
    if (found !== -1) return found;
  }
  return -1;
}

function findInChildren(parent: ElementNode, target: ElementNode, depth: number): number {
  for (const child of parent.children) {
    if (child === target) return depth;
    const found = findInChildren(child, target, depth + 1);
    if (found !== -1) return found;
  }
  return -1;
}
