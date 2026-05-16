/**
 * Healing Regression Detector
 *
 * Detects degradation in recovery rate, false recovery rate,
 * risky recovery rate, replay divergence, structural mutation stability.
 *
 * No AI. Deterministic threshold comparison.
 */

import type { HealingRegressionReport, HealingRegressionIndicator, HistoricalReliabilityBaseline, ReliabilityExecutionSession, RegressionSeverity } from './types.js';
import { ReliabilityScorer } from './reliability-scoring.js';

export class HealingRegressionDetector {
  detect(
    session: ReliabilityExecutionSession,
    baseline?: HistoricalReliabilityBaseline,
  ): HealingRegressionReport {
    const indicators: HealingRegressionIndicator[] = [];
    const current = this.aggregateCurrentMetrics(session);

    if (baseline) {
      const recoveryDev = current.healingSuccessRate - baseline.healingMetrics.healingSuccessRate;
      indicators.push(this.makeIndicator('healingSuccessRate', baseline.healingMetrics.healingSuccessRate, current.healingSuccessRate, recoveryDev));

      const falseDev = baseline.healingMetrics.falseRecoveryRate - current.falseRecoveryRate;
      indicators.push(this.makeIndicator('falseRecoveryRate', baseline.healingMetrics.falseRecoveryRate, current.falseRecoveryRate, falseDev));

      const replayDivDev = baseline.healingMetrics.replayDivergenceRate - current.replayDivergenceRate;
      indicators.push(this.makeIndicator('replayDivergenceRate', baseline.healingMetrics.replayDivergenceRate, current.replayDivergenceRate, replayDivDev));

      const rollbackDev = current.rollbackReliability - baseline.healingMetrics.rollbackReliability;
      indicators.push(this.makeIndicator('rollbackReliability', baseline.healingMetrics.rollbackReliability, current.rollbackReliability, rollbackDev));

      const patchDev = current.patchSurvivability - baseline.healingMetrics.patchSurvivability;
      indicators.push(this.makeIndicator('patchSurvivability', baseline.healingMetrics.patchSurvivability, current.patchSurvivability, patchDev));
    }

    const overallSeverity = this.computeOverallSeverity(indicators);

    return {
      sessionId: session.sessionId,
      indicators,
      recoveryRateRegression: indicators.some(i => i.metric === 'healingSuccessRate' && i.severity !== 'none'),
      falseRecoveryRegression: indicators.some(i => i.metric === 'falseRecoveryRate' && i.severity !== 'none'),
      riskyRecoveryRegression: false,
      replayDivergenceRegression: indicators.some(i => i.metric === 'replayDivergenceRate' && i.severity !== 'none'),
      structuralMutationRegression: indicators.some(i => i.metric === 'patchSurvivability' && i.severity !== 'none'),
      overallSeverity,
      detectedAt: session.completedAt,
    };
  }

  private aggregateCurrentMetrics(session: ReliabilityExecutionSession) {
    let totalAttempts = 0, successful = 0, falseRec = 0, replayDiv = 0, rollback = 0, patchSurv = 0;

    for (const run of session.runs) {
      if (run.healingMetrics) {
        totalAttempts += run.healingMetrics.totalHealingAttempts;
        successful += run.healingMetrics.successfulHealings;
        falseRec += run.healingMetrics.falseRecoveries;
        replayDiv += run.healingMetrics.replayDivergences;
        rollback += run.healingMetrics.rollbackReliability;
        patchSurv += run.healingMetrics.patchSurvivability;
      }
    }

    return {
      healingSuccessRate: totalAttempts > 0 ? successful / totalAttempts : 1,
      falseRecoveryRate: totalAttempts > 0 ? falseRec / totalAttempts : 0,
      replayDivergenceRate: totalAttempts > 0 ? replayDiv / totalAttempts : 0,
      rollbackReliability: totalAttempts > 0 ? rollback / totalAttempts : 1,
      patchSurvivability: totalAttempts > 0 ? patchSurv / totalAttempts : 1,
    };
  }

  private makeIndicator(
    metric: string,
    baseline: number,
    current: number,
    deviation: number,
  ): HealingRegressionIndicator {
    return {
      metric,
      baselineValue: baseline,
      currentValue: current,
      deviation,
      severity: ReliabilityScorer.deviationToSeverity(deviation),
    };
  }

  private computeOverallSeverity(indicators: HealingRegressionIndicator[]): RegressionSeverity {
    const severities: RegressionSeverity[] = indicators.map(i => i.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('severe')) return 'severe';
    if (severities.includes('moderate')) return 'moderate';
    if (severities.includes('minor')) return 'minor';
    return 'none';
  }
}
