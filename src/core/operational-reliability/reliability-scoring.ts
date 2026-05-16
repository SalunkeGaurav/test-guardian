/**
 * Reliability Scoring
 *
 * Generates composite operational reliability scores from
 * observed metrics. Deterministic weighted scoring.
 *
 * No AI. No adaptive weights. Fixed deterministic formula.
 */

import type { OperationalReliabilityScore, ReliabilityExecutionSession, HistoricalReliabilityBaseline, RegressionSeverity } from './types.js';

const WEIGHTS = {
  runtimeReliability: 0.25,
  healingReliability: 0.25,
  governanceTrustworthiness: 0.2,
  replayStability: 0.15,
  patchSafety: 0.15,
};

export class ReliabilityScorer {
  /**
   * Compute composite reliability score from an execution session.
   */
  computeScore(
    session: ReliabilityExecutionSession,
    baseline?: HistoricalReliabilityBaseline,
  ): OperationalReliabilityScore {
    const runtimeReliability = this.computeRuntimeReliability(session);
    const healingReliability = this.computeHealingReliability(session);
    const governanceTrustworthiness = this.computeGovernanceTrustworthiness(session);
    const replayStability = this.computeReplayStability(session);
    const patchSafety = this.computePatchSafety(session);

    const compositeScore =
      runtimeReliability * WEIGHTS.runtimeReliability +
      healingReliability * WEIGHTS.healingReliability +
      governanceTrustworthiness * WEIGHTS.governanceTrustworthiness +
      replayStability * WEIGHTS.replayStability +
      patchSafety * WEIGHTS.patchSafety;

    const grade = this.scoreToGrade(compositeScore);
    const trend = baseline ? this.computeTrend(compositeScore, baseline) : 'stable';

    return {
      sessionId: session.sessionId,
      runtimeReliability,
      healingReliability,
      governanceTrustworthiness,
      replayStability,
      patchSafety,
      compositeScore,
      grade,
      trend,
      scoredAt: session.completedAt,
    };
  }

  private computeRuntimeReliability(session: ReliabilityExecutionSession): number {
    const completedRuns = session.runs.filter(r => r.status === 'completed').length;
    const totalRuns = session.runs.length;
    if (totalRuns === 0) return 0;

    const completionRate = completedRuns / totalRuns;

    let stabilityScore = 0;
    let count = 0;
    for (const run of session.runs) {
      if (run.stabilityMetrics) {
        stabilityScore += run.stabilityMetrics.domStabilizationSuccessRate;
        count++;
      }
    }
    const avgStability = count > 0 ? stabilityScore / count : 0;

    return (completionRate * 0.6 + avgStability * 0.4);
  }

  private computeHealingReliability(session: ReliabilityExecutionSession): number {
    let totalAttempts = 0;
    let successfulHealings = 0;

    for (const run of session.runs) {
      if (run.healingMetrics) {
        totalAttempts += run.healingMetrics.totalHealingAttempts;
        successfulHealings += run.healingMetrics.successfulHealings;
      }
    }

    if (totalAttempts === 0) return 1;
    return successfulHealings / totalAttempts;
  }

  private computeGovernanceTrustworthiness(session: ReliabilityExecutionSession): number {
    let totalRuns = 0;
    let passedRuns = 0;

    for (const run of session.runs) {
      if (run.executionReport) {
        totalRuns++;
        if (run.executionReport.governanceDecisions.governancePassed) {
          passedRuns++;
        }
      }
    }

    if (totalRuns === 0) return 1;
    return passedRuns / totalRuns;
  }

  private computeReplayStability(session: ReliabilityExecutionSession): number {
    let totalRuns = 0;
    let stableRuns = 0;

    for (const run of session.runs) {
      if (run.executionReport) {
        totalRuns++;
        if (run.executionReport.replayStability.replayDeterministic) {
          stableRuns++;
        }
      }
    }

    if (totalRuns === 0) return 1;
    return stableRuns / totalRuns;
  }

  private computePatchSafety(session: ReliabilityExecutionSession): number {
    let totalRuns = 0;
    let safeRuns = 0;

    for (const run of session.runs) {
      if (run.executionReport) {
        totalRuns++;
        if (run.executionReport.sandboxVerification.compileSuccess) {
          safeRuns++;
        }
      }
    }

    if (totalRuns === 0) return 1;
    return safeRuns / totalRuns;
  }

  private scoreToGrade(score: number): OperationalReliabilityScore['grade'] {
    if (score >= 0.9) return 'A';
    if (score >= 0.75) return 'B';
    if (score >= 0.6) return 'C';
    if (score >= 0.4) return 'D';
    return 'F';
  }

  private computeTrend(
    currentScore: number,
    baseline: HistoricalReliabilityBaseline,
  ): OperationalReliabilityScore['trend'] {
    const baselineComposite =
      baseline.runtimeMetrics.domStabilizationSuccessRate * WEIGHTS.runtimeReliability +
      baseline.healingMetrics.healingSuccessRate * WEIGHTS.healingReliability +
      baseline.governanceMetrics.governancePassRate * WEIGHTS.governanceTrustworthiness +
      baseline.replayMetrics.reproducibilityRate * WEIGHTS.replayStability +
      baseline.patchMetrics.compilePreservationRate * WEIGHTS.patchSafety;

    const delta = currentScore - baselineComposite;
    if (delta > 0.05) return 'improving';
    if (delta < -0.05) return 'degrading';
    return 'stable';
  }

  /**
   * Determine regression severity from a deviation value.
   */
  static deviationToSeverity(deviation: number): RegressionSeverity {
    if (deviation >= 0) return 'none';
    if (deviation > -0.05) return 'minor';
    if (deviation > -0.15) return 'moderate';
    if (deviation > -0.3) return 'severe';
    return 'critical';
  }
}
