/**
 * Mutation Review Packaging
 *
 * Generates deterministic review bundles containing:
 * - proposed patch diff
 * - replay validation evidence
 * - governance analysis
 * - structural risk analysis
 * - confidence breakdown
 * - rollback metadata
 */

import type {
  HealingReviewSession,
  ReviewPackage,
} from './types.js';

export class MutationReviewPackager {
  package(session: HealingReviewSession): ReviewPackage {
    const structuralRisk = this.analyzeStructuralRisk(session);

    const confidenceBreakdown = this.buildConfidenceBreakdown(session);

    return {
      id: `review-package-${session.id}`,
      sessionId: session.id,
      failureSummary: this.buildFailureSummary(session),
      patchDiff: session.diff,
      governanceAnalysis: session.governance,
      structuralRisk,
      confidenceBreakdown,
      rollbackMetadata: session.rollback,
      createdAt: Date.now(),
    };
  }

  private buildFailureSummary(session: HealingReviewSession): string {
    const failure = session.failure;
    return `Locator "${failure.expression}" failed in test "${failure.testName}" (${failure.testFile}). Error: ${failure.errorMessage}`;
  }

  private analyzeStructuralRisk(session: HealingReviewSession): string[] {
    const risks: string[] = [];

    const gov = session.governance;
    if (gov.riskFactors && gov.riskFactors.length > 0) {
      risks.push(...gov.riskFactors);
    }

    if (session.diff.hunks.length > 3) {
      risks.push('Complex multi-hunk diff detected');
    }

    const hasLargeChange = session.diff.originalCode.split('\n').length > 20;
    if (hasLargeChange) {
      risks.push('Large code change may impact stability');
    }

    const hasDuplicatePattern = this.hasDuplicateSelectorPattern(session);
    if (hasDuplicatePattern) {
      risks.push('Selector may have duplicate pattern issues');
    }

    const hasAsyncDep = this.hasAsyncDependency(session);
    if (hasAsyncDep) {
      risks.push('Proposal has async/timing dependencies');
    }

    return risks;
  }

  private hasDuplicateSelectorPattern(session: HealingReviewSession): boolean {
    const proposed = session.proposal.proposedExpression;
    const parts = proposed.split(/[#.\[\]:]/);
    return parts.filter(p => p.length > 3).length > 5;
  }

  private hasAsyncDependency(session: HealingReviewSession): boolean {
    const evidence = session.replayEvidence;
    return evidence.some(e => e.timingInfo.timingVariance > 0.5);
  }

  private buildConfidenceBreakdown(session: HealingReviewSession): Record<string, number> {
    const breakdown: Record<string, number> = {};

    breakdown.proposalConfidence = session.proposal.confidence;

    breakdown.governanceScore = session.governance.confidenceScore;

    const avgReplayMatch = session.replayEvidence.length > 0
      ? session.replayEvidence.filter(e => e.matched).length / session.replayEvidence.length
      : 0;
    breakdown.replaySuccessRate = avgReplayMatch;

    const riskPenalty = this.calculateRiskPenalty(session.governance);
    breakdown.riskPenalty = riskPenalty;

    breakdown.overallConfidence = (
      session.proposal.confidence * 0.3 +
      session.governance.confidenceScore * 0.3 +
      avgReplayMatch * 0.3 -
      riskPenalty * 0.1
    );

    return breakdown;
  }

  private calculateRiskPenalty(governance: HealingReviewSession['governance']): number {
    let penalty = 0;

    switch (governance.riskLevel) {
      case 'critical':
        penalty = 0.3;
        break;
      case 'high':
        penalty = 0.2;
        break;
      case 'medium':
        penalty = 0.1;
        break;
      case 'low':
        penalty = 0;
        break;
    }

    penalty += governance.warnings.length * 0.05;

    return Math.min(penalty, 0.5);
  }

  formatForDisplay(pkg: ReviewPackage): string {
    const lines: string[] = [];

    lines.push('═'.repeat(60));
    lines.push('MUTATION REVIEW PACKAGE');
    lines.push('═'.repeat(60));
    lines.push('');

    lines.push('FAILURE:');
    lines.push(pkg.failureSummary);
    lines.push('');

    lines.push('DIFF:');
    lines.push(`  File: ${pkg.patchDiff.targetFile}:${pkg.patchDiff.targetLine}`);
    lines.push(`  Original: ${pkg.patchDiff.originalCode.split('\n').slice(0, 2).join('\\n')}`);
    lines.push(`  Patched: ${pkg.patchDiff.patchedCode.split('\n').slice(0, 2).join('\\n')}`);
    lines.push('');

    lines.push('GOVERNANCE:');
    lines.push(`  Risk Level: ${pkg.governanceAnalysis.riskLevel}`);
    lines.push(`  Confidence: ${(pkg.governanceAnalysis.confidenceScore * 100).toFixed(0)}%`);
    lines.push(`  Recommended: ${pkg.governanceAnalysis.approvalRecommended ? 'YES' : 'NO'}`);
    if (pkg.governanceAnalysis.warnings.length > 0) {
      lines.push('  Warnings:');
      for (const w of pkg.governanceAnalysis.warnings) {
        lines.push(`    - ${w}`);
      }
    }
    lines.push('');

    if (pkg.structuralRisk.length > 0) {
      lines.push('STRUCTURAL RISKS:');
      for (const r of pkg.structuralRisk) {
        lines.push(`  - ${r}`);
      }
      lines.push('');
    }

    lines.push('CONFIDENCE BREAKDOWN:');
    for (const [key, value] of Object.entries(pkg.confidenceBreakdown)) {
      lines.push(`  ${key}: ${(value * 100).toFixed(0)}%`);
    }
    lines.push('');

    lines.push('ROLLBACK:');
    lines.push(`  Can Rollback: ${pkg.rollbackMetadata.canRollback ? 'YES' : 'NO'}`);
    lines.push(`  Risk: ${pkg.rollbackMetadata.riskAssessment}`);
    lines.push('');

    lines.push('═'.repeat(60));

    return lines.join('\n');
  }
}