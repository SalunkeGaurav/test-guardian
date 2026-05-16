/**
 * Review Ergonomics Intelligence
 *
 * Evaluates developer review experience:
 * - explanation clarity
 * - governance understandability
 * - mutation readability
 * - replay evidence usefulness
 * - rollback confidence
 * - ambiguity visibility
 */

import type {
  HealingReviewSession,
  ReviewErgonomicsMetrics,
  ReviewErgonomicsReport,
} from './types.js';

export class ReviewErgonomicsAnalyzer {
  analyze(sessions: HealingReviewSession[]): ReviewErgonomicsReport {
    if (sessions.length === 0) {
      return this.createEmptyReport();
    }

    const metrics = this.computeMetrics(sessions);
    const summary = this.generateSummary(metrics);
    const recommendations = this.generateRecommendations(metrics);

    return {
      id: `ergonomics-${Date.now()}`,
      sessionCount: sessions.length,
      metrics,
      summary,
      recommendations,
      createdAt: Date.now(),
    };
  }

  private computeMetrics(sessions: HealingReviewSession[]): ReviewErgonomicsMetrics {
    const explanationClarity = this.evaluateExplanationClarity(sessions);
    const governanceUnderstandability = this.evaluateGovernanceUnderstandability(sessions);
    const mutationReadability = this.evaluateMutationReadability(sessions);
    const replayEvidenceUsefulness = this.evaluateReplayEvidenceUsefulness(sessions);
    const rollbackConfidence = this.evaluateRollbackConfidence(sessions);
    const ambiguityVisibility = this.evaluateAmbiguityVisibility(sessions);

    return {
      explanationClarity,
      governanceUnderstandability,
      mutationReadability,
      replayEvidenceUsefulness,
      rollbackConfidence,
      ambiguityVisibility,
    };
  }

  private evaluateExplanationClarity(sessions: HealingReviewSession[]): number {
    let total = 0;
    let count = 0;

    for (const session of sessions) {
      if (session.proposal.evidence && session.proposal.evidence.length > 0) {
        const evidenceCount = session.proposal.evidence.length;
        const clarityScore = Math.min(evidenceCount / 3, 1);
        total += clarityScore;
        count++;
      }
    }

    return count > 0 ? total / count : 0.5;
  }

  private evaluateGovernanceUnderstandability(sessions: HealingReviewSession[]): number {
    let total = 0;
    let count = 0;

    for (const session of sessions) {
      const gov = session.governance;

      const hasRiskLevel = gov.riskLevel !== undefined;
      const hasWarnings = gov.warnings && gov.warnings.length > 0;
      const hasRiskFactors = gov.riskFactors && gov.riskFactors.length > 0;
      const hasRecommendation = gov.approvalRecommended !== undefined;

      const understandability = [hasRiskLevel, hasWarnings, hasRiskFactors, hasRecommendation]
        .filter(Boolean).length / 4;

      total += understandability;
      count++;
    }

    return count > 0 ? total / count : 0.5;
  }

  private evaluateMutationReadability(sessions: HealingReviewSession[]): number {
    let total = 0;
    let count = 0;

    for (const session of sessions) {
      const diff = session.diff;

      const hasOriginal = diff.originalCode && diff.originalCode.length > 0;
      const hasPatched = diff.patchedCode && diff.patchedCode.length > 0;
      const hasFile = diff.targetFile && diff.targetFile.length > 0;
      const hasLine = diff.targetLine !== undefined;

      const readability = [hasOriginal, hasPatched, hasFile, hasLine]
        .filter(Boolean).length / 4;

      total += readability;
      count++;
    }

    return count > 0 ? total / count : 0.5;
  }

  private evaluateReplayEvidenceUsefulness(sessions: HealingReviewSession[]): number {
    let total = 0;
    let count = 0;

    for (const session of sessions) {
      const evidence = session.replayEvidence;

      if (evidence.length === 0) {
        total += 0.3;
        count++;
        continue;
      }

      let usefulnessScore = 0;
      for (const ev of evidence) {
        const hasMatchResult = ev.matched !== undefined;
        const hasMatchCount = ev.matchedElementCount !== undefined;
        const hasTiming = ev.timingInfo && ev.timingInfo.duration > 0;

        usefulnessScore += [hasMatchResult, hasMatchCount, hasTiming]
          .filter(Boolean).length / 3;
      }

      total += usefulnessScore / evidence.length;
      count++;
    }

    return count > 0 ? total / count : 0.5;
  }

  private evaluateRollbackConfidence(sessions: HealingReviewSession[]): number {
    let total = 0;
    let count = 0;

    for (const session of sessions) {
      const rollback = session.rollback;

      const canRollback = rollback.canRollback === true;
      const hasOriginalExpression = rollback.originalExpression && rollback.originalExpression.length > 0;
      const hasRollbackCode = rollback.rollbackCode && rollback.rollbackCode.length > 0;
      const hasRiskAssessment = rollback.riskAssessment && rollback.riskAssessment.length > 0;

      const confidence = [canRollback, hasOriginalExpression, hasRollbackCode, hasRiskAssessment]
        .filter(Boolean).length / 4;

      total += confidence;
      count++;
    }

    return count > 0 ? total / count : 0.5;
  }

  private evaluateAmbiguityVisibility(sessions: HealingReviewSession[]): number {
    let total = 0;
    let count = 0;

    for (const session of sessions) {
      const evidence = session.replayEvidence;

      const hasAmbiguousMatches = evidence.some(e => e.matchedElementCount > 1);
      const hasFalsePositives = evidence.some(e => e.falsePositiveIndicators.length > 0);
      const hasGovernanceWarnings = session.governance.warnings.length > 0;

      const visibility = [hasAmbiguousMatches, hasFalsePositives, hasGovernanceWarnings]
        .filter(Boolean).length / 3;

      total += visibility;
      count++;
    }

    return count > 0 ? total / count : 0.3;
  }

  private generateSummary(metrics: ReviewErgonomicsMetrics): string {
    const scores: { name: string; score: number }[] = [
      { name: 'Explanation Clarity', score: metrics.explanationClarity },
      { name: 'Governance Understandability', score: metrics.governanceUnderstandability },
      { name: 'Mutation Readability', score: metrics.mutationReadability },
      { name: 'Replay Evidence Usefulness', score: metrics.replayEvidenceUsefulness },
      { name: 'Rollback Confidence', score: metrics.rollbackConfidence },
      { name: 'Ambiguity Visibility', score: metrics.ambiguityVisibility },
    ];

    scores.sort((a, b) => a.score - b.score);

    const lowest = scores[0];
    const highest = scores[scores.length - 1];

    return `Ergonomics analysis: lowest scoring area is ${lowest.name} (${(lowest.score * 100).toFixed(0)}%), highest is ${highest.name} (${(highest.score * 100).toFixed(0)}%).`;
  }

  private generateRecommendations(metrics: ReviewErgonomicsMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.explanationClarity < 0.6) {
      recommendations.push('Improve proposal evidence presentation with clearer explanations');
    }

    if (metrics.governanceUnderstandability < 0.6) {
      recommendations.push('Enhance governance evaluation display with risk factor summaries');
    }

    if (metrics.mutationReadability < 0.6) {
      recommendations.push('Improve diff presentation with syntax highlighting and context');
    }

    if (metrics.replayEvidenceUsefulness < 0.6) {
      recommendations.push('Add timing variance indicators and stability metrics to replay evidence');
    }

    if (metrics.rollbackConfidence < 0.6) {
      recommendations.push('Provide more detailed rollback risk assessments');
    }

    if (metrics.ambiguityVisibility < 0.4) {
      recommendations.push('Increase visibility of ambiguous matches and false positive indicators');
    }

    if (recommendations.length === 0) {
      recommendations.push('All ergonomics metrics are within acceptable ranges');
    }

    return recommendations;
  }

  private createEmptyReport(): ReviewErgonomicsReport {
    return {
      id: `ergonomics-${Date.now()}`,
      sessionCount: 0,
      metrics: {
        explanationClarity: 0,
        governanceUnderstandability: 0,
        mutationReadability: 0,
        replayEvidenceUsefulness: 0,
        rollbackConfidence: 0,
        ambiguityVisibility: 0,
      },
      summary: 'No sessions analyzed',
      recommendations: ['Run workflow simulation to generate review sessions'],
      createdAt: Date.now(),
    };
  }
}