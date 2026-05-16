/**
 * Deterministic Healing Candidate Ranker
 *
 * Ranks candidates using a weighted composite score based on:
 * - survivability score (weight: 0.30)
 * - structural similarity (weight: 0.20)
 * - attribute match score (weight: 0.20)
 * - hierarchy stability (weight: 0.15)
 * - replay context confidence (weight: 0.15)
 *
 * All scoring is deterministic. No randomness.
 * Returns candidates sorted by overall score descending.
 */

import type { HealingCandidate, CandidateRanking } from '../../models/healing-candidate.js';
import type { LocatorSurvivabilityResult, DomComparisonResult, SimilarityMetrics } from '../../models/dom-intelligence.js';

const WEIGHTS = {
  survivabilityScore: 0.30,
  structuralSimilarity: 0.20,
  attributeMatchScore: 0.20,
  hierarchyStability: 0.15,
  replayContextConfidence: 0.15,
};

function computeAttributeMatchScore(candidate: HealingCandidate, survivability?: LocatorSurvivabilityResult): number {
  if (survivability && survivability.attributesRenamed.length > 0) {
    const unchanged = survivability.attributesRenamed.filter(a => a.before === a.after).length;
    const total = survivability.attributesRenamed.length;
    return total > 0 ? unchanged / total : 1;
  }

  // Derive from the candidate's strategy confidence
  switch (candidate.strategy) {
    case 'attribute-similarity': return 0.9;
    case 'accessibility-metadata': return 0.8;
    case 'historical-selector-evolution': return 0.7;
    case 'text-proximity': return 0.5;
    case 'structural-proximity': return 0.5;
    case 'hierarchy-matching': return 0.4;
    case 'sibling-relationship': return 0.4;
    default: return 0.5;
  }
}

function computeStructuralSimilarity(candidate: HealingCandidate, comparison?: DomComparisonResult): number {
  if (comparison) {
    return comparison.structuralSimilarity;
  }
  return 0.5;
}

function computeHierarchyStability(candidate: HealingCandidate, survivability?: LocatorSurvivabilityResult): number {
  if (!survivability) return 0.5;
  if (survivability.hierarchyChanged) return 0.2;
  if (survivability.moved) return 0.4;
  return 0.8;
}

function computeReplayContextConfidence(
  candidate: HealingCandidate,
  similarity?: SimilarityMetrics,
): number {
  if (similarity) {
    return similarity.overall;
  }
  return 0.5;
}

export function rankCandidate(
  candidate: HealingCandidate,
  survivability?: LocatorSurvivabilityResult,
  comparison?: DomComparisonResult,
  similarity?: SimilarityMetrics,
): CandidateRanking {
  const attributeMatchScore = computeAttributeMatchScore(candidate, survivability);
  const structuralSimilarity = computeStructuralSimilarity(candidate, comparison);
  const hierarchyStability = computeHierarchyStability(candidate, survivability);
  const replayContextConfidence = computeReplayContextConfidence(candidate, similarity);
  const survivabilityScore = survivability?.confidence ?? candidate.confidence;

  const overall = Math.round(
    (survivabilityScore * WEIGHTS.survivabilityScore +
      structuralSimilarity * WEIGHTS.structuralSimilarity +
      attributeMatchScore * WEIGHTS.attributeMatchScore +
      hierarchyStability * WEIGHTS.hierarchyStability +
      replayContextConfidence * WEIGHTS.replayContextConfidence) * 10000,
  ) / 10000;

  return {
    overall: Math.min(1, Math.max(0, overall)),
    survivabilityScore: Math.round(survivabilityScore * 10000) / 10000,
    structuralSimilarity: Math.round(structuralSimilarity * 10000) / 10000,
    attributeMatchScore: Math.round(attributeMatchScore * 10000) / 10000,
    hierarchyStability: Math.round(hierarchyStability * 10000) / 10000,
    replayContextConfidence: Math.round(replayContextConfidence * 10000) / 10000,
  };
}

export function rankCandidates(
  candidates: HealingCandidate[],
  survivability?: LocatorSurvivabilityResult,
  comparison?: DomComparisonResult,
  similarity?: SimilarityMetrics,
): HealingCandidate[] {
  const ranked = candidates.map(c => {
    const ranking = rankCandidate(c, survivability, comparison, similarity);
    return {
      ...c,
      confidence: ranking.overall,
      ranking,
      explanation: {
        ...c.explanation,
        confidenceBreakdown: ranking,
      },
    };
  });

  // Sort by overall confidence descending, then by strategy priority
  return ranked.sort((a, b) => {
    const diff = b.ranking.overall - a.ranking.overall;
    if (diff !== 0) return diff;
    // Tiebreaker: strategy priority order
    const order = [
      'attribute-similarity', 'accessibility-metadata', 'historical-selector-evolution',
      'text-proximity', 'structural-proximity', 'hierarchy-matching', 'sibling-relationship',
    ];
    return order.indexOf(a.strategy) - order.indexOf(b.strategy);
  });
}

export function removeLowConfidence(
  candidates: HealingCandidate[],
  threshold: number = 0.15,
): HealingCandidate[] {
  return candidates.filter(c => c.confidence >= threshold);
}

export function deduplicateCandidates(candidates: HealingCandidate[]): HealingCandidate[] {
  const seen = new Set<string>();
  return candidates.filter(c => {
    const key = c.proposedExpression;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
