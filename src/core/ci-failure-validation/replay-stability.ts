/**
 * Replay Stability Analyzer
 *
 * Measures replay stability across real historical failures:
 * - flaky replay frequency
 * - replay reproducibility
 * - timing sensitivity
 * - iframe/modal instability
 * - async rendering divergence
 * - hidden navigation drift
 */

import type {
  HistoricalFailure,
  FailureReplaySession,
  ReplayStabilityMetrics,
  ReplayStabilityReport,
} from './types.js';

export class ReplayStabilityAnalyzer {
  analyze(
    failure: HistoricalFailure,
    replaySession: FailureReplaySession
  ): ReplayStabilityMetrics {
    const flakyFrequency = this.computeFlakyFrequency(replaySession);
    const reproducibilityScore = this.computeReproducibilityScore(replaySession);
    const timingSensitivity = this.computeTimingSensitivity(replaySession);
    const modalIframeInstability = this.computeModalIframeInstability(replaySession);
    const asyncRenderingDivergence = this.computeAsyncRenderingDivergence(replaySession);
    const navigationDriftDetected = this.detectNavigationDrift(replaySession);
    const consistentResults = this.areResultsConsistent(replaySession);

    return {
      failureId: failure.id,
      flakyFrequency,
      reproducibilityScore,
      timingSensitivity,
      modalIframeInstability,
      asyncRenderingDivergence,
      navigationDriftDetected,
      replayAttempts: replaySession.replayAttempts,
      consistentResults,
    };
  }

  analyzeBatch(
    failures: HistoricalFailure[],
    replaySessions: Map<string, FailureReplaySession>
  ): ReplayStabilityReport {
    const metrics: ReplayStabilityMetrics[] = [];

    for (const failure of failures) {
      const session = replaySessions.get(failure.id);
      if (session) {
        metrics.push(this.analyze(failure, session));
      }
    }

    const overallFlakyRate = this.computeOverallFlakyRate(metrics);
    const overallReproducibility = this.computeOverallReproducibility(metrics);
    const timingSensitiveCount = metrics.filter(m => m.timingSensitivity > 0.5).length;
    const modalIframeUnstableCount = metrics.filter(m => m.modalIframeInstability > 0.3).length;
    const asyncDivergentCount = metrics.filter(m => m.asyncRenderingDivergence > 0.4).length;
    const navigationDriftCount = metrics.filter(m => m.navigationDriftDetected).length;
    const summary = this.generateSummary(metrics);

    return {
      id: `replay-stability-${Date.now()}`,
      totalFailures: failures.length,
      metrics,
      overallFlakyRate,
      overallReproducibility,
      timingSensitiveCount,
      modalIframeUnstableCount,
      asyncDivergentCount,
      navigationDriftCount,
      summary,
      createdAt: Date.now(),
    };
  }

  private computeFlakyFrequency(replaySession: FailureReplaySession): number {
    if (replaySession.replayResults.length === 0) return 0;

    const results = replaySession.replayResults.map(r => r.success);
    let flakyCount = 0;

    for (let i = 1; i < results.length; i++) {
      if (results[i] !== results[i - 1]) {
        flakyCount++;
      }
    }

    return flakyCount / (results.length - 1);
  }

  private computeReproducibilityScore(replaySession: FailureReplaySession): number {
    if (replaySession.replayResults.length === 0) return 0;

    if (replaySession.reproducible) return 1;

    const successRate = replaySession.replayResults.filter(r => r.success).length /
      replaySession.replayResults.length;

    return Math.abs(successRate - 0.5) * 2;
  }

  private computeTimingSensitivity(replaySession: FailureReplaySession): number {
    if (replaySession.replayResults.length < 2) return 0;

    const durations = replaySession.replayResults.map(r => r.duration);
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;

    if (mean === 0) return 0;

    const variance = replaySession.timingMetrics.variance;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    return Math.min(coefficientOfVariation, 1);
  }

  private computeModalIframeInstability(replaySession: FailureReplaySession): number {
    if (replaySession.replayResults.length === 0) return 0;

    const modalIframeIssues = replaySession.replayResults.filter(r => r.modalIframeIssue).length;
    return modalIframeIssues / replaySession.replayResults.length;
  }

  private computeAsyncRenderingDivergence(replaySession: FailureReplaySession): number {
    if (replaySession.replayResults.length === 0) return 0;

    const asyncIssues = replaySession.replayResults.filter(r => r.asyncInstability).length;
    return asyncIssues / replaySession.replayResults.length;
  }

  private detectNavigationDrift(replaySession: FailureReplaySession): boolean {
    return replaySession.replayResults.some(r => r.navigationDrift);
  }

  private areResultsConsistent(replaySession: FailureReplaySession): boolean {
    return replaySession.reproducible;
  }

  private computeOverallFlakyRate(metrics: ReplayStabilityMetrics[]): number {
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.flakyFrequency, 0);
    return total / metrics.length;
  }

  private computeOverallReproducibility(metrics: ReplayStabilityMetrics[]): number {
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.reproducibilityScore, 0);
    return total / metrics.length;
  }

  private generateSummary(metrics: ReplayStabilityMetrics[]): string {
    const flakyRate = this.computeOverallFlakyRate(metrics);
    const reproducibility = this.computeOverallReproducibility(metrics);
    const timingSensitive = metrics.filter(m => m.timingSensitivity > 0.5).length;

    return `Overall flaky rate: ${(flakyRate * 100).toFixed(0)}%, reproducibility: ${(reproducibility * 100).toFixed(0)}%, timing-sensitive: ${timingSensitive}/${metrics.length}.`;
  }
}