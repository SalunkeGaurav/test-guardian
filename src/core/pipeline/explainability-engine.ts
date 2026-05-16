/**
 * ExplainabilityEngine
 *
 * Generates deterministic, human-readable explanations for healing proposals.
 * Each explanation captures: why this candidate was ranked this way,
 * what validation evidence exists, and what governance decisions were made.
 *
 * No AI. No LLM. Deterministic rule-based reasoning.
 */

import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { ValidationResult } from '../../models/validation.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';
import type { HealingExplanation } from '../../models/healing-explanation.js';

export class ExplainabilityEngine {
  /**
   * Generate a full explanation for a healing candidate.
   */
  explain(
    candidate: HealingCandidate,
    validationResult?: ValidationResult,
    runtimeResult?: RuntimeValidationResult,
    _governanceOutcome?: unknown,
    _stabilityAnalysis?: unknown,
    rejectionReasons: string[] = [],
  ): HealingExplanation {
    const reasons: string[] = [];
    const supportingEvidence: string[] = [];

    reasons.push(`${candidate.strategy}: ${candidate.proposedStrategy} (confidence: ${candidate.confidence.toFixed(2)})`);

    if (candidate.domEvidence.originalPath && candidate.domEvidence.matchedPath) {
      supportingEvidence.push(`DOM path: ${candidate.domEvidence.originalPath} → ${candidate.domEvidence.matchedPath}`);
    }

    if (candidate.domEvidence.originalTag && candidate.domEvidence.matchedTag) {
      supportingEvidence.push(`Tag: ${candidate.domEvidence.originalTag} → ${candidate.domEvidence.matchedTag}`);
    }

    if (candidate.domEvidence.stableAttributeMatches.length > 0) {
      supportingEvidence.push(`Stable attributes: ${candidate.domEvidence.stableAttributeMatches.join(', ')}`);
    }

    const evidence: HealingExplanation['evidence'] = {};

    if (validationResult) {
      evidence.staticValidation = {
        status: validationResult.status,
        matchedElementCount: validationResult.matchedElementCount,
        interactionSuccess: validationResult.interactionSuccess,
        replayConfidence: validationResult.replayConfidence,
        falsePositives: validationResult.falsePositiveIndicators.map(fp => fp.type),
      };

      if (validationResult.status === 'passed') {
        reasons.push('Static DOM validation passed');
      } else if (validationResult.status === 'failed') {
        reasons.push(`Static validation: FAILED — ${validationResult.failureReason ?? 'element not found'}`);
      } else {
        reasons.push(`Static validation: ${validationResult.status.toUpperCase()}`);
      }

      if (validationResult.falsePositiveIndicators.length > 0) {
        const fpDetails = validationResult.falsePositiveIndicators.map(fp => fp.type).join(', ');
        supportingEvidence.push(`False-positive indicators: ${fpDetails}`);
      }
    }

    if (runtimeResult) {
      evidence.runtimeValidation = {
        status: runtimeResult.status,
        runtimeConfidence: runtimeResult.runtimeConfidence,
        executedStepCount: runtimeResult.executedStepCount,
        divergences: runtimeResult.replayDivergence.map(d => `${d.type} at step ${d.stepIndex}`),
        falsePositives: runtimeResult.falsePositiveIndicators.map(fp => fp.type),
      };

      if (runtimeResult.status === 'passed') {
        reasons.push('Runtime validation: PASSED');
        supportingEvidence.push(`Executed ${runtimeResult.executedStepCount} step(s) successfully`);
      } else if (runtimeResult.status === 'failed') {
        reasons.push(`Runtime validation: FAILED — step ${runtimeResult.failedStepId ?? 'unknown'} failed`);
      } else {
        reasons.push(`Runtime validation: ${runtimeResult.status.toUpperCase()}`);
      }

      if (runtimeResult.replayDivergence.length > 0) {
        supportingEvidence.push(`${runtimeResult.replayDivergence.length} divergence(s) detected during replay`);
      }

      if (runtimeResult.falsePositiveIndicators.length > 0) {
        const fpDetails = runtimeResult.falsePositiveIndicators.map(fp => fp.type).join(', ');
        supportingEvidence.push(`Runtime false-positive indicators: ${fpDetails}`);
      }
    }

    if (rejectionReasons.length > 0) {
      reasons.push(...rejectionReasons.map(r => `Rejected: ${r}`));
    }

    return {
      proposalId: candidate.id,
      locatorId: candidate.locatorId,
      strategy: candidate.strategy,
      proposedExpression: candidate.proposedExpression,
      confidenceBreakdown: candidate.ranking,
      rankingExplanation: this.buildRankingExplanation(candidate),
      domEvidenceSummary: this.buildDomEvidenceSummary(candidate),
      structuralChangeExplanation: this.buildStructuralExplanation(candidate),
      evidence,
      rejectionReasons,
      rejectionReason: rejectionReasons.length > 0 ? rejectionReasons[0] : undefined,
      createdAt: Date.now(),
    };
  }

  private buildRankingExplanation(candidate: HealingCandidate): string {
    const parts: string[] = [];
    const r = candidate.ranking;
    const confidenceLabel = r.overall < 0.3 ? 'Low-confidence' : r.overall < 0.7 ? 'Moderate-confidence' : 'High-confidence';
    parts.push(confidenceLabel);
    parts.push(`Overall rank: ${r.overall}`);
    parts.push(`Survivability: ${r.survivabilityScore.toFixed(2)}`);
    parts.push(`Structural similarity: ${r.structuralSimilarity.toFixed(2)}`);
    parts.push(`Attribute match: ${r.attributeMatchScore.toFixed(2)}`);
    parts.push(`Hierarchy stability: ${r.hierarchyStability.toFixed(2)}`);
    parts.push(`Replay context: ${r.replayContextConfidence.toFixed(2)}`);
    return parts.join('; ');
  }

  private buildDomEvidenceSummary(candidate: HealingCandidate): string {
    const ev = candidate.domEvidence;
    const parts: string[] = [];
    if (ev.originalPath) parts.push(`Original path: ${ev.originalPath}`);
    if (ev.matchedPath) parts.push(`Matched path: ${ev.matchedPath}`);
    if (ev.originalTag) parts.push(`Original tag: ${ev.originalTag}`);
    if (ev.matchedTag) parts.push(`Matched tag: ${ev.matchedTag}`);
    if (ev.stableAttributeMatches.length > 0) parts.push(`Stable attrs: ${ev.stableAttributeMatches.join(', ')}`);
    if (ev.textContentMatch) parts.push(`Text match: "${ev.textContentMatch}"`);
    return parts.join('; ') || 'No DOM evidence available';
  }

  private buildStructuralExplanation(candidate: HealingCandidate): string {
    const exp = candidate.explanation;
    const parts: string[] = [];
    parts.push(`Strategy applied: ${exp.strategyApplied}`);
    parts.push(`Why matched: ${exp.whyMatched}`);
    if (exp.structuralChanges.length > 0) {
      parts.push(`Structural changes: ${exp.structuralChanges.map(c => `${c.whatChanged} (${c.type})`).join(', ')}`);
    }
    parts.push(`Survivability reasoning: ${exp.survivabilityReasoning}`);
    return parts.join('; ');
  }
}