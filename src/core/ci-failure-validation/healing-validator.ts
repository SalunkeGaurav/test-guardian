/**
 * Historical Healing Validator
 *
 * Evaluates healing effectiveness on real historical failures:
 * - healing recovery rate
 * - risky recovery rate
 * - replay divergence rate
 * - governance rejection effectiveness
 * - rollback reliability
 * - patch survivability
 */

import type {
  HistoricalFailure,
  FailureReplaySession,
  RealFailureClassification,
  HistoricalHealingValidation,
  HistoricalHealingValidationReport,
} from './types.js';

export class HistoricalHealingValidator {
  validate(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession,
    classification?: RealFailureClassification
  ): HistoricalHealingValidation {
    const healingAttempted = this.shouldAttemptHealing(failure, classification);
    const healingSuccessful = healingAttempted && this.isHealingSuccessful(failure, replaySession);
    const recoveryType = this.determineRecoveryType(failure, replaySession, classification);
    const replayDivergence = this.hasReplayDivergence(replaySession);
    const governanceRejected = this.isGovernanceRejected(classification);
    const rollbackAvailable = this.isRollbackAvailable(failure);
    const patchSurvivability = this.estimatePatchSurvivability(failure, replaySession);
    const evidence = this.gatherEvidence(failure, replaySession, classification);

    return {
      failureId: failure.id,
      healingAttempted,
      healingSuccessful,
      recoveryType,
      replayDivergence,
      governanceRejected,
      rollbackAvailable,
      patchSurvivability,
      evidence,
    };
  }

  validateBatch(
    failures: HistoricalFailure[],
    replaySessions: Map<string, FailureReplaySession>,
    classifications: Map<string, RealFailureClassification>
  ): HistoricalHealingValidationReport {
    const validations = failures.map(f =>
      this.validate(f, replaySessions.get(f.id), classifications.get(f.id))
    );

    const recoveryRate = this.computeRecoveryRate(validations);
    const riskyRecoveryRate = this.computeRiskyRecoveryRate(validations);
    const replayDivergenceRate = this.computeReplayDivergenceRate(validations);
    const governanceRejectionRate = this.computeGovernanceRejectionRate(validations);
    const rollbackReliability = this.computeRollbackReliability(validations);
    const patchSurvivabilityAvg = this.computePatchSurvivabilityAvg(validations);
    const summary = this.generateSummary(validations);

    return {
      id: `healing-validation-${Date.now()}`,
      totalFailures: failures.length,
      validations,
      recoveryRate,
      riskyRecoveryRate,
      replayDivergenceRate,
      governanceRejectionRate,
      rollbackReliability,
      patchSurvivabilityAvg,
      summary,
      createdAt: Date.now(),
    };
  }

  private shouldAttemptHealing(
    failure: HistoricalFailure,
    classification?: RealFailureClassification
  ): boolean {
    if (classification?.category === 'unsupported-structure') return false;
    if (classification?.category === 'deceptive-successful-replay') return false;

    return true;
  }

  private isHealingSuccessful(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession
  ): boolean {
    if (!replaySession) return false;

    const successRate = replaySession.replayResults.filter(r => r.success).length /
      replaySession.replayResults.length;

    return successRate > 0.7;
  }

  private determineRecoveryType(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession,
    classification?: RealFailureClassification
  ): 'safe' | 'risky' | 'deceptive' | 'failed' {
    if (!replaySession) return 'failed';

    const successRate = replaySession.replayResults.filter(r => r.success).length /
      replaySession.replayResults.length;

    if (successRate < 0.3) return 'failed';

    if (classification?.isDeceptive) return 'deceptive';

    const hasFalsePositives = replaySession.replayResults.some(
      r => r.falsePositiveIndicators.length > 0
    );

    if (hasFalsePositives || !replaySession.reproducible) return 'risky';

    return 'safe';
  }

  private hasReplayDivergence(replaySession?: FailureReplaySession): boolean {
    if (!replaySession) return false;

    return !replaySession.reproducible;
  }

  private isGovernanceRejected(classification?: RealFailureClassification): boolean {
    if (!classification) return false;

    return classification.governanceAmbiguous || classification.isDeceptive;
  }

  private isRollbackAvailable(failure: HistoricalFailure): boolean {
    return failure.category !== 'unsupported-structure';
  }

  private estimatePatchSurvivability(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession
  ): number {
    if (!replaySession) return 0;

    const successRate = replaySession.replayResults.filter(r => r.success).length /
      replaySession.replayResults.length;

    const stabilityPenalty = replaySession.reproducible ? 0 : 0.2;
    const falsePositivePenalty = replaySession.replayResults.filter(
      r => r.falsePositiveIndicators.length > 0
    ).length / replaySession.replayResults.length * 0.1;

    return Math.max(0, successRate - stabilityPenalty - falsePositivePenalty);
  }

  private gatherEvidence(
    failure: HistoricalFailure,
    replaySession?: FailureReplaySession,
    classification?: RealFailureClassification
  ): string[] {
    const evidence: string[] = [];

    evidence.push(`Category: ${failure.category}`);
    evidence.push(`Severity: ${failure.severity}`);

    if (classification) {
      evidence.push(`Classification confidence: ${(classification.confidence * 100).toFixed(0)}%`);
    }

    if (replaySession) {
      const successCount = replaySession.replayResults.filter(r => r.success).length;
      evidence.push(`Replay success: ${successCount}/${replaySession.replayAttempts}`);
      evidence.push(`Reproducible: ${replaySession.reproducible}`);
    }

    return evidence;
  }

  private computeRecoveryRate(validations: HistoricalHealingValidation[]): number {
    const attempted = validations.filter(v => v.healingAttempted);
    if (attempted.length === 0) return 0;

    const successful = attempted.filter(v => v.healingSuccessful);
    return successful.length / attempted.length;
  }

  private computeRiskyRecoveryRate(validations: HistoricalHealingValidation[]): number {
    const attempted = validations.filter(v => v.healingAttempted);
    if (attempted.length === 0) return 0;

    const risky = attempted.filter(v => v.recoveryType === 'risky' || v.recoveryType === 'deceptive');
    return risky.length / attempted.length;
  }

  private computeReplayDivergenceRate(validations: HistoricalHealingValidation[]): number {
    if (validations.length === 0) return 0;

    const divergent = validations.filter(v => v.replayDivergence);
    return divergent.length / validations.length;
  }

  private computeGovernanceRejectionRate(validations: HistoricalHealingValidation[]): number {
    if (validations.length === 0) return 0;

    const rejected = validations.filter(v => v.governanceRejected);
    return rejected.length / validations.length;
  }

  private computeRollbackReliability(validations: HistoricalHealingValidation[]): number {
    if (validations.length === 0) return 0;

    const rollbackable = validations.filter(v => v.rollbackAvailable);
    return rollbackable.length / validations.length;
  }

  private computePatchSurvivabilityAvg(validations: HistoricalHealingValidation[]): number {
    if (validations.length === 0) return 0;

    const total = validations.reduce((sum, v) => sum + v.patchSurvivability, 0);
    return total / validations.length;
  }

  private generateSummary(validations: HistoricalHealingValidation[]): string {
    const recoveryRate = this.computeRecoveryRate(validations);
    const riskyRate = this.computeRiskyRecoveryRate(validations);
    const divergenceRate = this.computeReplayDivergenceRate(validations);

    return `Recovery rate: ${(recoveryRate * 100).toFixed(0)}%, risky recovery: ${(riskyRate * 100).toFixed(0)}%, replay divergence: ${(divergenceRate * 100).toFixed(0)}%.`;
  }
}