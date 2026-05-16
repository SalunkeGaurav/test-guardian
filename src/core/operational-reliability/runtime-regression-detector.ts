/**
 * Runtime Regression Detector
 *
 * Detects regressions in replay success, runtime stabilization,
 * stale context recovery, iframe/modal handling, async render recovery.
 *
 * Compares against historical baselines.
 *
 * No AI. Deterministic threshold comparison.
 */

import type { RuntimeRegressionReport, RuntimeRegressionIndicator, HistoricalReliabilityBaseline, ReliabilityExecutionSession, RegressionSeverity } from './types.js';
import { ReliabilityScorer } from './reliability-scoring.js';

export class RuntimeRegressionDetector {
  /**
   * Detect runtime regressions by comparing current session metrics
   * against historical baseline.
   */
  detect(
    session: ReliabilityExecutionSession,
    baseline?: HistoricalReliabilityBaseline,
  ): RuntimeRegressionReport {
    const indicators: RuntimeRegressionIndicator[] = [];

    const current = this.aggregateCurrentMetrics(session);

    if (baseline) {
      const domDev = current.domStabilizationSuccessRate - baseline.runtimeMetrics.domStabilizationSuccessRate;
      indicators.push(this.makeIndicator('domStabilizationSuccessRate', baseline.runtimeMetrics.domStabilizationSuccessRate, current.domStabilizationSuccessRate, domDev));

      const replayDev = current.replayRecoverySuccess - baseline.runtimeMetrics.replayRecoverySuccess;
      indicators.push(this.makeIndicator('replayRecoverySuccess', baseline.runtimeMetrics.replayRecoverySuccess, current.replayRecoverySuccess, replayDev));

      const staleDev = current.staleRecoverySuccess - baseline.runtimeMetrics.staleRecoverySuccess;
      indicators.push(this.makeIndicator('staleRecoverySuccess', baseline.runtimeMetrics.staleRecoverySuccess, current.staleRecoverySuccess, staleDev));

      const iframeDev = current.iframeRecoveryRate - baseline.runtimeMetrics.iframeRecoveryRate;
      indicators.push(this.makeIndicator('iframeRecoveryRate', baseline.runtimeMetrics.iframeRecoveryRate, current.iframeRecoveryRate, iframeDev));

      const asyncDev = baseline.runtimeMetrics.asyncRenderInstabilityFrequency - current.asyncRenderInstabilityFrequency;
      indicators.push(this.makeIndicator('asyncRenderInstabilityFrequency', baseline.runtimeMetrics.asyncRenderInstabilityFrequency, current.asyncRenderInstabilityFrequency, asyncDev));

      const driftDev = baseline.runtimeMetrics.replayDriftFrequency - current.replayDriftFrequency;
      indicators.push(this.makeIndicator('replayDriftFrequency', baseline.runtimeMetrics.replayDriftFrequency, current.replayDriftFrequency, driftDev));
    }

    const overallSeverity = this.computeOverallSeverity(indicators);

    return {
      sessionId: session.sessionId,
      indicators,
      replaySuccessRegression: indicators.some(i => i.metric === 'replayRecoverySuccess' && i.severity !== 'none'),
      stabilizationRegression: indicators.some(i => i.metric === 'domStabilizationSuccessRate' && i.severity !== 'none'),
      staleRecoveryRegression: indicators.some(i => i.metric === 'staleRecoverySuccess' && i.severity !== 'none'),
      iframeRecoveryRegression: indicators.some(i => i.metric === 'iframeRecoveryRate' && i.severity !== 'none'),
      asyncRenderRegression: indicators.some(i => i.metric === 'asyncRenderInstabilityFrequency' && i.severity !== 'none'),
      overallSeverity,
      detectedAt: session.completedAt,
    };
  }

  private aggregateCurrentMetrics(session: ReliabilityExecutionSession) {
    let domStab = 0, replayRec = 0, staleRec = 0, iframeRec = 0, asyncInst = 0, driftFreq = 0;
    let count = 0;

    for (const run of session.runs) {
      if (run.stabilityMetrics) {
        domStab += run.stabilityMetrics.domStabilizationSuccessRate;
        replayRec += run.stabilityMetrics.replayRecoverySuccess;
        staleRec += run.stabilityMetrics.staleRecoverySuccess;
        iframeRec += run.stabilityMetrics.iframeRecoveryRate;
        asyncInst += run.stabilityMetrics.asyncRenderInstabilityFrequency;
        driftFreq += run.stabilityMetrics.replayDriftFrequency;
        count++;
      }
    }

    return count > 0 ? {
      domStabilizationSuccessRate: domStab / count,
      replayRecoverySuccess: replayRec / count,
      staleRecoverySuccess: staleRec / count,
      iframeRecoveryRate: iframeRec / count,
      asyncRenderInstabilityFrequency: asyncInst / count,
      replayDriftFrequency: driftFreq / count,
    } : {
      domStabilizationSuccessRate: 0,
      replayRecoverySuccess: 0,
      staleRecoverySuccess: 0,
      iframeRecoveryRate: 0,
      asyncRenderInstabilityFrequency: 0,
      replayDriftFrequency: 0,
    };
  }

  private makeIndicator(
    metric: string,
    baseline: number,
    current: number,
    deviation: number,
  ): RuntimeRegressionIndicator {
    return {
      metric,
      baselineValue: baseline,
      currentValue: current,
      deviation,
      severity: ReliabilityScorer.deviationToSeverity(deviation),
    };
  }

  private computeOverallSeverity(indicators: RuntimeRegressionIndicator[]): RegressionSeverity {
    const severities: RegressionSeverity[] = indicators.map(i => i.severity);
    if (severities.includes('critical')) return 'critical';
    if (severities.includes('severe')) return 'severe';
    if (severities.includes('moderate')) return 'moderate';
    if (severities.includes('minor')) return 'minor';
    return 'none';
  }
}
