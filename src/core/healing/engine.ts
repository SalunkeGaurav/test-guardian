/**
 * HealingEngine
 *
 * Deterministic healing candidate generation and ranking engine.
 *
 * Inputs:
 *   - Locator (the failing locator)
 *   - Original DOM (DOM where locator was known to work)
 *   - Current DOM (DOM where locator failed)
 *   - Optional: DomComparisonResult, LocatorSurvivabilityResult, SimilarityMetrics, ReplaySession
 *
 * Outputs:
 *   - Ranked HealingCandidate[] (sorted best-first, low-confidence removed, deduplicated)
 *
 * Responsibilities:
 *   - Generate candidates via 7 deterministic strategies
 *   - Rank using weighted composite scoring
 *   - Remove candidates below confidence threshold
 *   - Deduplicate proposals
 *   - Attach explanation metadata
 *
 * Does NOT:
 *   - Apply patches
 *   - Modify files
 *   - Execute browser replay
 *   - Use AI or LLMs
 *   - Use embeddings
 */

import type { Result } from '../../models/result.js';
import type { Locator } from '../../models/locator.js';
import type { ElementNode } from '../../models/snapshot.js';
import type { DomComparisonResult, LocatorSurvivabilityResult, SimilarityMetrics } from '../../models/dom-intelligence.js';
import type { ReplaySession } from '../../models/replay.js';
import type { HealingCandidate } from '../../models/healing-candidate.js';
import { analyzeLocatorSurvivability } from '../dom/survivability.js';
import { diffTrees } from '../dom/comparator.js';
import { computeSimilarity } from '../dom/scoring.js';
import { collectCandidates } from './strategies.js';
import { rankCandidates, removeLowConfidence, deduplicateCandidates } from './ranker.js';
import { success, failure } from '../../models/result.js';

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.15;

export interface HealingInput {
  locator: Locator;
  originalDom: ElementNode[];
  currentDom: ElementNode[];
  replaySession?: ReplaySession;
  comparison?: DomComparisonResult;
  survivability?: LocatorSurvivabilityResult;
  similarity?: SimilarityMetrics;
}

export class HealingEngine {
  private readonly threshold: number;

  constructor(threshold: number = DEFAULT_CONFIDENCE_THRESHOLD) {
    this.threshold = threshold;
  }

  /**
   * Run the full healing pipeline for a single locator.
   *
   * 1. Analyze survivability
   * 2. Compare DOM structures
   * 3. Compute similarity metrics
   * 4. Generate candidates via all strategies
   * 5. Rank candidates
   * 6. Remove low-confidence
   * 7. Deduplicate
   * 8. Return final ranked list
   */
  heal(input: HealingInput): Result<HealingCandidate[]> {
    try {
      // Compute DOM intelligence if not provided
      const survivability = input.survivability ?? analyzeLocatorSurvivability(
        input.locator,
        input.originalDom,
        input.currentDom,
      );
      const comparison = input.comparison ?? diffTrees(input.originalDom, input.currentDom);
      const similarity = input.similarity ?? computeSimilarity(input.originalDom, input.currentDom);

      // Generate candidates
      const rawCandidates = collectCandidates(input.locator, input.originalDom, input.currentDom);

      if (rawCandidates.length === 0) {
        return failure('No healing candidates generated');
      }

      // Rank
      const ranked = rankCandidates(rawCandidates, survivability, comparison, similarity);

      // Remove low-confidence
      const filtered = removeLowConfidence(ranked, this.threshold);

      if (filtered.length === 0) {
        return failure('All candidates below confidence threshold');
      }

      // Deduplicate
      const final = deduplicateCandidates(filtered);

      // Attach replay context ref if available
      if (input.replaySession) {
        for (const c of final) {
          c.replayContextRef = input.replaySession.id;
          c.explanation.survivabilityReasoning += ` | replay: ${input.replaySession.testName} (${input.replaySession.steps.length} steps)`;
        }
      }

      // Build explanation for each candidate
      for (const c of final) {
        c.explanation.attributeChanges = survivability.attributesRenamed;
        c.explanation.structuralChanges = buildStructuralChanges(comparison, c);
        c.explanation.survivabilityReasoning = buildSurvivabilityReasoning(survivability, c);
      }

      return success(final);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }
}

function buildStructuralChanges(
  comparison: DomComparisonResult,
  candidate: HealingCandidate,
): Array<{ whatChanged: string; type: string; before?: string; after?: string }> {
  const changes: Array<{ whatChanged: string; type: string; before?: string; after?: string }> = [];
  const domPath = candidate.domEvidence.originalPath ?? candidate.domEvidence.matchedPath ?? '';

  // Check if target node was changed
  const changed = comparison.changed.find(c => domPath.includes(c.path) || c.path.includes(domPath));
  if (changed) {
    changes.push({
      whatChanged: `Node ${changed.path} has changed attributes`,
      type: 'attribute-change',
      before: changed.before ? JSON.stringify(changed.before) : undefined,
      after: changed.after ? JSON.stringify(changed.after) : undefined,
    });
  }

  // Check if surrounding structure changed
  if (comparison.removed.length > 0) {
    changes.push({
      whatChanged: `${comparison.removed.length} node(s) removed from structure`,
      type: 'structural-removal',
    });
  }
  if (comparison.added.length > 0) {
    changes.push({
      whatChanged: `${comparison.added.length} node(s) added to structure`,
      type: 'structural-addition',
    });
  }

  if (changes.length === 0) {
    changes.push({ whatChanged: 'No structural changes detected', type: 'unchanged' });
  }

  return changes;
}

function buildSurvivabilityReasoning(
  survivability: LocatorSurvivabilityResult,
  candidate: HealingCandidate,
): string {
  const parts: string[] = [];

  if (survivability.exists) {
    parts.push('Element exists in current DOM');
  } else {
    parts.push('Element does not exist at original location');
  }

  if (survivability.moved) {
    parts.push('Element has moved in the tree');
  }

  const attrChanges = survivability.attributesRenamed;
  if (attrChanges.length > 0) {
    const renamed = attrChanges.filter(a => a.before && a.after && a.before !== a.after);
    const removed = attrChanges.filter(a => a.before && !a.after);
    if (renamed.length > 0) {
      parts.push(`${renamed.length} attribute(s) changed value`);
    }
    if (removed.length > 0) {
      parts.push(`${removed.length} attribute(s) removed`);
    }
  }

  if (survivability.hierarchyChanged) {
    parts.push('Element hierarchy depth changed');
  }

  parts.push(`Strategy ${candidate.strategy} proposing ${candidate.proposedExpression}`);

  return parts.join(' | ');
}
