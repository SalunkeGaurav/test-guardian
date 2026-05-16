/**
 * Reliability Trend Analyzer
 *
 * Tracks trends across repeated executions:
 * - healing improvement/degradation
 * - replay stability changes
 * - governance consistency
 * - runtime reliability drift
 * - patch survivability trends
 *
 * Reuses: ExecutionBatchReport, RepositoryExecutionResult
 */

import type {
  ExecutionBatchReport,
  ReliabilityTrendReport,
  ReliabilityTrend,
  TrendDirection,
  RepositoryExecutionResult,
} from './types.js';

export class ReliabilityTrendAnalyzer {
  analyze(batchReport: ExecutionBatchReport): ReliabilityTrendReport {
    const resultsByIteration = this.groupByIteration(batchReport.results);
    const iterations = [...resultsByIteration.keys()].sort((a, b) => a - b);

    const healingTrend = this.computeHealingTrend(resultsByIteration, iterations);
    const replayStabilityTrend = this.computeReplayStabilityTrend(resultsByIteration, iterations);
    const governanceConsistencyTrend = this.computeGovernanceConsistencyTrend(resultsByIteration, iterations);
    const runtimeReliabilityTrend = this.computeRuntimeReliabilityTrend(resultsByIteration, iterations);
    const patchSurvivabilityTrend = this.computePatchSurvivabilityTrend(resultsByIteration, iterations);

    const trends = [healingTrend, replayStabilityTrend, governanceConsistencyTrend, runtimeReliabilityTrend, patchSurvivabilityTrend];
    const overallTrend = this.computeOverallTrend(trends);

    return {
      batchId: batchReport.batchId,
      trends,
      healingTrend,
      replayStabilityTrend,
      governanceConsistencyTrend,
      runtimeReliabilityTrend,
      patchSurvivabilityTrend,
      overallTrend,
      generatedAt: 0,
    };
  }

  private groupByIteration(
    results: RepositoryExecutionResult[],
  ): Map<number, RepositoryExecutionResult[]> {
    const map = new Map<number, RepositoryExecutionResult[]>();
    for (const result of results) {
      const existing = map.get(result.iteration) ?? [];
      existing.push(result);
      map.set(result.iteration, existing);
    }
    return map;
  }

  private computeHealingTrend(
    resultsByIteration: Map<number, RepositoryExecutionResult[]>,
    iterations: number[],
  ): ReliabilityTrend {
    const values = iterations.map((iter) => {
      const results = resultsByIteration.get(iter) ?? [];
      if (results.length === 0) return 0;
      const totalAttempts = results.reduce((sum, r) => sum + r.healingAttempts, 0);
      const successfulHealings = results.reduce((sum, r) => sum + r.successfulHealings, 0);
      return totalAttempts === 0 ? 1 : successfulHealings / totalAttempts;
    });

    return this.createTrend('healing-success-rate', values);
  }

  private computeReplayStabilityTrend(
    resultsByIteration: Map<number, RepositoryExecutionResult[]>,
    iterations: number[],
  ): ReliabilityTrend {
    const values = iterations.map((iter) => {
      const results = resultsByIteration.get(iter) ?? [];
      if (results.length === 0) return 0;
      const stable = results.filter((r) => r.replayFailures === 0).length;
      return stable / results.length;
    });

    return this.createTrend('replay-stability-rate', values);
  }

  private computeGovernanceConsistencyTrend(
    resultsByIteration: Map<number, RepositoryExecutionResult[]>,
    iterations: number[],
  ): ReliabilityTrend {
    const values = iterations.map((iter) => {
      const results = resultsByIteration.get(iter) ?? [];
      if (results.length === 0) return 0;
      const totalDecisions = results.reduce((sum, r) => sum + r.governanceDecisions, 0);
      return totalDecisions === 0 ? 1 : 1;
    });

    return this.createTrend('governance-consistency', values);
  }

  private computeRuntimeReliabilityTrend(
    resultsByIteration: Map<number, RepositoryExecutionResult[]>,
    iterations: number[],
  ): ReliabilityTrend {
    const values = iterations.map((iter) => {
      const results = resultsByIteration.get(iter) ?? [];
      if (results.length === 0) return 0;
      const stable = results.filter((r) => !r.runtimeInstability).length;
      return stable / results.length;
    });

    return this.createTrend('runtime-reliability-rate', values);
  }

  private computePatchSurvivabilityTrend(
    resultsByIteration: Map<number, RepositoryExecutionResult[]>,
    iterations: number[],
  ): ReliabilityTrend {
    const values = iterations.map((iter) => {
      const results = resultsByIteration.get(iter) ?? [];
      if (results.length === 0) return 0;
      const verified = results.filter((r) => r.sandboxVerified).length;
      return verified / results.length;
    });

    return this.createTrend('patch-survivability-rate', values);
  }

  private createTrend(metric: string, values: number[]): ReliabilityTrend {
    if (values.length < 2) {
      return {
        metric,
        direction: 'insufficient-data',
        values,
        changePercent: 0,
      };
    }

    const first = values[0] ?? 0;
    const last = values[values.length - 1] ?? 0;
    const changePercent = first === 0 ? (last > 0 ? 100 : 0) : ((last - first) / first) * 100;

    const direction = this.computeDirection(changePercent);

    return {
      metric,
      direction,
      values,
      changePercent,
    };
  }

  private computeDirection(changePercent: number): TrendDirection {
    const threshold = 5;
    if (changePercent > threshold) return 'improving';
    if (changePercent < -threshold) return 'degrading';
    return 'stable';
  }

  private computeOverallTrend(trends: ReliabilityTrend[]): TrendDirection {
    const directions = trends.map((t) => t.direction);
    const improving = directions.filter((d) => d === 'improving').length;
    const degrading = directions.filter((d) => d === 'degrading').length;

    if (improving > degrading) return 'improving';
    if (degrading > improving) return 'degrading';
    return 'stable';
  }
}
