/**
 * Trustworthiness Benchmarker
 *
 * Benchmarks platform trustworthiness against real failures:
 * - governance trustworthiness
 * - confidence reliability
 * - deceptive mutation detection
 * - structurally misleading recovery detection
 * - rollback safety
 * - developer review safety
 */

import type {
  HistoricalFailure,
  FailureReplaySession,
  RealFailureClassification,
  HistoricalHealingValidation,
  ReplayStabilityMetrics,
  TrustworthinessMetric,
  TrustworthinessBenchmarkReport,
} from './types.js';

export class TrustworthinessBenchmarker {
  benchmark(
    failures: HistoricalFailure[],
    replaySessions: Map<string, FailureReplaySession>,
    classifications: RealFailureClassification[],
    healingValidations: HistoricalHealingValidation[],
    stabilityMetrics: ReplayStabilityMetrics[]
  ): TrustworthinessBenchmarkReport {
    const governanceTrustworthiness = this.computeGovernanceTrustworthiness(classifications, healingValidations);
    const confidenceReliability = this.computeConfidenceReliability(classifications);
    const deceptiveMutationDetectionRate = this.computeDeceptiveDetectionRate(classifications);
    const misleadingRecoveryDetectionRate = this.computeMisleadingRecoveryDetectionRate(healingValidations);
    const rollbackSafety = this.computeRollbackSafety(healingValidations);
    const developerReviewSafety = this.computeDeveloperReviewSafety(classifications, stabilityMetrics);

    const metrics = this.buildMetrics(
      governanceTrustworthiness,
      confidenceReliability,
      deceptiveMutationDetectionRate,
      misleadingRecoveryDetectionRate,
      rollbackSafety,
      developerReviewSafety
    );

    const summary = this.generateSummary(metrics);

    return {
      id: `trustworthiness-benchmark-${Date.now()}`,
      totalFailures: failures.length,
      governanceTrustworthiness,
      confidenceReliability,
      deceptiveMutationDetectionRate,
      misleadingRecoveryDetectionRate,
      rollbackSafety,
      developerReviewSafety,
      metrics,
      summary,
      createdAt: Date.now(),
    };
  }

  private computeGovernanceTrustworthiness(
    classifications: RealFailureClassification[],
    healingValidations: HistoricalHealingValidation[]
  ): number {
    if (classifications.length === 0) return 0;

    const governanceCorrect = classifications.filter(c => {
      const validation = healingValidations.find(v => v.failureId === c.failureId);
      if (!validation) return false;

      if (c.isDeceptive && validation.governanceRejected) return true;
      if (c.governanceAmbiguous && validation.governanceRejected) return true;
      if (!c.isDeceptive && !c.governanceAmbiguous && !validation.governanceRejected) return true;

      return false;
    }).length;

    return governanceCorrect / classifications.length;
  }

  private computeConfidenceReliability(classifications: RealFailureClassification[]): number {
    if (classifications.length === 0) return 0;

    const highConfidence = classifications.filter(c => c.confidence > 0.7);
    const highConfidenceCorrect = highConfidence.filter(c => {
      return c.replayStable && !c.isDeceptive;
    }).length;

    return highConfidence.length > 0 ? highConfidenceCorrect / highConfidence.length : 0.5;
  }

  private computeDeceptiveDetectionRate(classifications: RealFailureClassification[]): number {
    if (classifications.length === 0) return 0;

    const deceptive = classifications.filter(c => c.isDeceptive);
    const detected = deceptive.filter(c => c.deceptiveIndicators.length > 0);

    return deceptive.length > 0 ? detected.length / deceptive.length : 1;
  }

  private computeMisleadingRecoveryDetectionRate(
    healingValidations: HistoricalHealingValidation[]
  ): number {
    if (healingValidations.length === 0) return 0;

    const riskyOrDeceptive = healingValidations.filter(
      v => v.recoveryType === 'risky' || v.recoveryType === 'deceptive'
    );

    const detected = riskyOrDeceptive.filter(v => v.replayDivergence || v.governanceRejected);

    return riskyOrDeceptive.length > 0 ? detected.length / riskyOrDeceptive.length : 1;
  }

  private computeRollbackSafety(healingValidations: HistoricalHealingValidation[]): number {
    if (healingValidations.length === 0) return 0;

    const rollbackable = healingValidations.filter(v => v.rollbackAvailable);
    return rollbackable.length / healingValidations.length;
  }

  private computeDeveloperReviewSafety(
    classifications: RealFailureClassification[],
    stabilityMetrics: ReplayStabilityMetrics[]
  ): number {
    if (classifications.length === 0) return 0;

    let safeCount = 0;

    for (const c of classifications) {
      const stability = stabilityMetrics.find(m => m.failureId === c.failureId);

      const isClassifiedCorrectly = !c.isDeceptive || c.deceptiveIndicators.length > 0;
      const isStable = !stability || stability.consistentResults;

      if (isClassifiedCorrectly && isStable) {
        safeCount++;
      }
    }

    return safeCount / classifications.length;
  }

  private buildMetrics(
    governanceTrustworthiness: number,
    confidenceReliability: number,
    deceptiveDetectionRate: number,
    misleadingRecoveryDetectionRate: number,
    rollbackSafety: number,
    developerReviewSafety: number
  ): TrustworthinessMetric[] {
    return [
      {
        category: 'governance-trustworthiness',
        score: governanceTrustworthiness,
        threshold: 0.7,
        passed: governanceTrustworthiness >= 0.7,
        evidence: ['Governance correctly identifies deceptive and ambiguous cases'],
      },
      {
        category: 'confidence-reliability',
        score: confidenceReliability,
        threshold: 0.6,
        passed: confidenceReliability >= 0.6,
        evidence: ['High confidence scores correlate with stable, non-deceptive recoveries'],
      },
      {
        category: 'deceptive-mutation-detection',
        score: deceptiveDetectionRate,
        threshold: 0.8,
        passed: deceptiveDetectionRate >= 0.8,
        evidence: ['Deceptive mutations are detected and flagged'],
      },
      {
        category: 'misleading-recovery-detection',
        score: misleadingRecoveryDetectionRate,
        threshold: 0.7,
        passed: misleadingRecoveryDetectionRate >= 0.7,
        evidence: ['Risky and deceptive recoveries are identified'],
      },
      {
        category: 'rollback-safety',
        score: rollbackSafety,
        threshold: 0.9,
        passed: rollbackSafety >= 0.9,
        evidence: ['Rollback is available for most failures'],
      },
      {
        category: 'developer-review-safety',
        score: developerReviewSafety,
        threshold: 0.7,
        passed: developerReviewSafety >= 0.7,
        evidence: ['Developers can safely review and approve recoveries'],
      },
    ];
  }

  private generateSummary(metrics: TrustworthinessMetric[]): string {
    const passed = metrics.filter(m => m.passed).length;
    const total = metrics.length;

    const failed = metrics.filter(m => !m.passed);
    const failedCategories = failed.map(m => m.category).join(', ');

    if (failed.length === 0) {
      return `All ${total} trustworthiness metrics passed thresholds.`;
    }

    return `${passed}/${total} metrics passed. Failed: ${failedCategories}.`;
  }
}