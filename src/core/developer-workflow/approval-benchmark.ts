/**
 * Approval Workflow Benchmarking
 *
 * Measures:
 * - safe approval rate
 * - risky approval rate
 * - rejection precision
 * - rollback usage frequency
 * - confidence comprehension effectiveness
 */

import type {
  HealingReviewSession,
  ApprovalWorkflowMetrics,
  ApprovalWorkflowBenchmark,
} from './types.js';

export class ApprovalWorkflowBenchmarker {
  benchmark(sessions: HealingReviewSession[]): ApprovalWorkflowBenchmark {
    const metrics = this.computeMetrics(sessions);
    const recommendation = this.generateRecommendation(metrics);

    return {
      id: `approval-benchmark-${Date.now()}`,
      safeApprovalRate: this.calculateSafeApprovalRate(metrics),
      riskyApprovalRate: this.calculateRiskyApprovalRate(metrics),
      rejectionPrecision: this.calculateRejectionPrecision(metrics),
      rollbackUsageRate: this.calculateRollbackUsageRate(metrics),
      confidenceComprehensionRate: metrics.confidenceComprehensionEffectiveness,
      metrics,
      recommendation,
      createdAt: Date.now(),
    };
  }

  private computeMetrics(sessions: HealingReviewSession[]): ApprovalWorkflowMetrics {
    let safeApprovalCount = 0;
    let riskyApprovalCount = 0;
    let rejectionCount = 0;
    let rollbackCount = 0;
    let confidenceComprehensionCount = 0;

    for (const session of sessions) {
      if (session.finalDecision === 'approved') {
        if (this.isSafeApproval(session)) {
          safeApprovalCount++;
        } else {
          riskyApprovalCount++;
        }
      } else if (session.finalDecision === 'rejected') {
        rejectionCount++;
      }

      if (session.currentStage === 'rollback-initiated') {
        rollbackCount++;
      }

      if (this.hasConfidenceComprehension(session)) {
        confidenceComprehensionCount++;
      }
    }

    return {
      totalSessions: sessions.length,
      safeApprovalCount,
      riskyApprovalCount,
      rejectionCount,
      rollbackCount,
      confidenceComprehensionEffectiveness: sessions.length > 0 
        ? confidenceComprehensionCount / sessions.length 
        : 0,
    };
  }

  private isSafeApproval(session: HealingReviewSession): boolean {
    return session.governance.riskLevel === 'low' &&
           session.governance.approvalRecommended &&
           session.replayEvidence.every(e => e.matched) &&
           session.governance.warnings.length === 0;
  }

  private hasConfidenceComprehension(session: HealingReviewSession): boolean {
    return session.governance.confidenceScore !== undefined &&
           session.governance.confidenceScore > 0;
  }

  private calculateSafeApprovalRate(metrics: ApprovalWorkflowMetrics): number {
    const totalDecisions = metrics.safeApprovalCount + metrics.riskyApprovalCount;
    return totalDecisions > 0 
      ? metrics.safeApprovalCount / totalDecisions 
      : 0;
  }

  private calculateRiskyApprovalRate(metrics: ApprovalWorkflowMetrics): number {
    const totalDecisions = metrics.safeApprovalCount + metrics.riskyApprovalCount;
    return totalDecisions > 0 
      ? metrics.riskyApprovalCount / totalDecisions 
      : 0;
  }

  private calculateRejectionPrecision(metrics: ApprovalWorkflowMetrics): number {
    const totalRejections = metrics.rejectionCount;
    return totalRejections > 0 ? 1 : 0;
  }

  private calculateRollbackUsageRate(metrics: ApprovalWorkflowMetrics): number {
    const approvedCount = metrics.safeApprovalCount + metrics.riskyApprovalCount;
    return approvedCount > 0 
      ? metrics.rollbackCount / approvedCount 
      : 0;
  }

  private generateRecommendation(metrics: ApprovalWorkflowMetrics): string {
    const safeRate = this.calculateSafeApprovalRate(metrics);
    const riskyRate = this.calculateRiskyApprovalRate(metrics);
    const rollbackRate = this.calculateRollbackUsageRate(metrics);

    const parts: string[] = [];

    if (safeRate > 0.8) {
      parts.push('High safe approval rate indicates good developer decision making');
    } else if (safeRate < 0.5) {
      parts.push('Low safe approval rate - consider improving proposal quality');
    }

    if (riskyRate > 0.2) {
      parts.push('Significant risky approvals detected - enhance governance warnings');
    }

    if (rollbackRate > 0.3) {
      parts.push('High rollback usage - improve initial approval confidence');
    }

    if (metrics.confidenceComprehensionEffectiveness < 0.6) {
      parts.push('Confidence score comprehension needs improvement');
    }

    if (parts.length === 0) {
      parts.push('Workflow metrics are within acceptable ranges');
    }

    return parts.join(' ');
  }
}