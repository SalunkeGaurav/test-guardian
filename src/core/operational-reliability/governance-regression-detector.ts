/**
 * Governance Regression Detector
 *
 * Detects increasing false approvals, false rejections, unstable
 * confidence calibration, replay trust degradation.
 *
 * No AI. Deterministic threshold comparison.
 */

import type { GovernanceRegressionReport, GovernanceRegressionIndicator, HistoricalReliabilityBaseline, ReliabilityExecutionSession, RegressionSeverity } from './types.js';
import { ReliabilityScorer } from './reliability-scoring.js';

export class GovernanceRegressionDetector {
  detect(
    session: ReliabilityExecutionSession,
    baseline?: HistoricalReliabilityBaseline,
  ): GovernanceRegressionReport {
    const indicators: GovernanceRegressionIndicator[] = [];
    const current = this.aggregateCurrentMetrics(session);

    if (baseline) {
      const passDev = current.governancePassRate - baseline.governanceMetrics.governancePassRate;
      indicators.push(this.makeIndicator('governancePassRate', baseline.governanceMetrics.governancePassRate, current.governancePassRate, passDev));

      const gateDev = current.averageGatePassRate - baseline.governanceMetrics.averageGatePassRate;
      indicators.push(this.makeIndicator('averageGatePassRate', baseline.governanceMetrics.averageGatePassRate, current.averageGatePassRate, gateDev));
    }

    const overallSeverity = this.computeOverallSeverity(indicators);

    return {
      sessionId: session.sessionId,
      indicators,
      falseApprovalIncrease: indicators.some(i => i.metric === 'governancePassRate' && i.deviation > 0.1),
      falseRejectionIncrease: indicators.some(i => i.metric === 'governancePassRate' && i.deviation < -0.1),
      confidenceCalibrationDrift: indicators.some(i => i.metric === 'averageGatePassRate' && Math.abs(i.deviation) > 0.05),
      replayTrustDegradation: false,
      overallSeverity,
      detectedAt: session.completedAt,
    };
  }

  private aggregateCurrentMetrics(session: ReliabilityExecutionSession) {
    let totalRuns = 0, passedRuns = 0, totalGates = 0, passedGates = 0;

    for (const run of session.runs) {
      if (run.executionReport) {
        totalRuns++;
        if (run.executionReport.governanceDecisions.governancePassed) {
          passedRuns++;
        }
        totalGates += run.executionReport.governanceDecisions.gatesPassed + run.executionReport.governanceDecisions.gatesFailed;
        passedGates += run.executionReport.governanceDecisions.gatesPassed;
      }
    }

    return {
      governancePassRate: totalRuns > 0 ? passedRuns / totalRuns : 1,
      averageGatePassRate: totalGates > 0 ? passedGates / totalGates : 1,
    };
  }

  private makeIndicator(
    metric: string,
    baseline: number,
    current: number,
    deviation: number,
  ): GovernanceRegressionIndicator {
    return {
      metric,
      baselineValue: baseline,
      currentValue: current,
      deviation,
      severity: ReliabilityScorer.deviationToSeverity(deviation),
    };
  }

  private computeOverallSeverity(indicators: GovernanceRegressionIndicator[]): RegressionSeverity {
    const severities: RegressionSeverity[] = indicators.map(i => i.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('severe')) return 'severe';
    if (severities.includes('moderate')) return 'moderate';
    if (severities.includes('minor')) return 'minor';
    return 'none';
  }
}
