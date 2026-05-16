/**
 * Cross-Repository Aggregation
 *
 * Generates cross-repository operational aggregation reports:
 * - Overall compatibility distribution
 * - Unsupported pattern frequency
 * - Most fragile selector patterns
 * - Most unstable replay structures
 * - Governance failure clusters
 * - Runtime instability clusters
 * - Performance bottlenecks
 * - Repository-type correlation analysis
 * - Failure hotspot inventory
 *
 * No Date.now(). No Math.random(). Deterministic only.
 */

import type {
  CrossRepositoryAggregation,
  RepositoryExecutionResult,
  CompatibilityDistribution,
  UnsupportedPatternFrequency,
  FragileSelectorPattern,
  UnstableReplayStructure,
  GovernanceFailureCluster,
  RuntimeInstabilityCluster,
  PerformanceBottleneck,
  RepositoryTypeCorrelation,
  FailureHotspot,
  RecoveryMetric,
} from './types.js';

let aggregationCounter = 0;
function nextAggregationId(): string {
  aggregationCounter++;
  return `aggregation-${aggregationCounter}`;
}

export class CrossRepositoryAggregator {
  aggregate(corpusPath: string, results: RepositoryExecutionResult[]): CrossRepositoryAggregation {
    const aggregationId = nextAggregationId();

    const completedResults = results.filter((r) => r.status === 'completed');
    const failedResults = results.filter((r) => r.status === 'failed');

    const compatibilityDistribution = this.computeCompatibilityDistribution(completedResults);
    const unsupportedPatternFrequency = this.computeUnsupportedPatternFrequency(completedResults);
    const fragileSelectorPatterns = this.computeFragileSelectorPatterns(completedResults);
    const unstableReplayStructures = this.computeUnstableReplayStructures(completedResults);
    const governanceFailureClusters = this.computeGovernanceFailureClusters(completedResults);
    const runtimeInstabilityClusters = this.computeRuntimeInstabilityClusters(completedResults);
    const performanceBottlenecks = this.computePerformanceBottlenecks(completedResults);
    const repositoryTypeCorrelation = this.computeRepositoryTypeCorrelation(results);
    const failureHotspots = this.computeFailureHotspots(failedResults);
    const recoveryMetrics = this.computeRecoveryMetrics(completedResults);

    return {
      aggregationId,
      corpusPath,
      totalRepositories: results.length,
      completedRepositories: completedResults.length,
      failedRepositories: failedResults.length,
      compatibilityDistribution,
      unsupportedPatternFrequency,
      fragileSelectorPatterns,
      unstableReplayStructures,
      governanceFailureClusters,
      runtimeInstabilityClusters,
      performanceBottlenecks,
      repositoryTypeCorrelation,
      failureHotspots,
      recoveryMetrics,
      generatedAt: 0,
    };
  }

  private computeCompatibilityDistribution(results: RepositoryExecutionResult[]): CompatibilityDistribution {
    const dist: CompatibilityDistribution = { supported: 0, partiallySupported: 0, unsupported: 0, unknown: 0 };

    for (const result of results) {
      const status = result.compatibilityStatus ?? 'unknown';
      if (status === 'supported') dist.supported++;
      else if (status === 'partially-supported') dist.partiallySupported++;
      else if (status === 'unsupported') dist.unsupported++;
      else dist.unknown++;
    }

    return dist;
  }

  private computeUnsupportedPatternFrequency(results: RepositoryExecutionResult[]): UnsupportedPatternFrequency[] {
    const patternMap = new Map<string, { frequency: number; affectedRepositories: string[] }>();

    for (const result of results) {
      if (!result.unsupportedPatterns) continue;
      for (const pattern of result.unsupportedPatterns) {
        const existing = patternMap.get(pattern) ?? { frequency: 0, affectedRepositories: [] };
        existing.frequency++;
        if (!existing.affectedRepositories.includes(result.repoPath)) {
          existing.affectedRepositories.push(result.repoPath);
        }
        patternMap.set(pattern, existing);
      }
    }

    return [...patternMap.entries()]
      .map(([pattern, data]) => ({
        pattern,
        frequency: data.frequency,
        affectedRepositories: data.affectedRepositories.sort(),
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private computeFragileSelectorPatterns(results: RepositoryExecutionResult[]): FragileSelectorPattern[] {
    const failedResults = results.filter((r) => r.status === 'failed');
    const patternMap = new Map<string, { failureCount: number; affectedRepositories: string[] }>();

    for (const result of failedResults) {
      const reason = result.error ?? 'unknown';
      const existing = patternMap.get(reason) ?? { failureCount: 0, affectedRepositories: [] };
      existing.failureCount++;
      if (!existing.affectedRepositories.includes(result.repoPath)) {
        existing.affectedRepositories.push(result.repoPath);
      }
      patternMap.set(reason, existing);
    }

    return [...patternMap.entries()]
      .map(([selector, data]) => ({
        selector,
        failureCount: data.failureCount,
        affectedRepositories: data.affectedRepositories.sort(),
      }))
      .sort((a, b) => b.failureCount - a.failureCount);
  }

  private computeUnstableReplayStructures(results: RepositoryExecutionResult[]): UnstableReplayStructure[] {
    const unstableResults = results.filter((r) => r.replayInstability);
    const structureMap = new Map<string, { failureCount: number; affectedRepositories: string[] }>();

    for (const result of unstableResults) {
      const structure = result.category;
      const existing = structureMap.get(structure) ?? { failureCount: 0, affectedRepositories: [] };
      existing.failureCount++;
      if (!existing.affectedRepositories.includes(result.repoPath)) {
        existing.affectedRepositories.push(result.repoPath);
      }
      structureMap.set(structure, existing);
    }

    return [...structureMap.entries()]
      .map(([structure, data]) => ({
        structure,
        failureCount: data.failureCount,
        affectedRepositories: data.affectedRepositories.sort(),
      }))
      .sort((a, b) => b.failureCount - a.failureCount);
  }

  private computeGovernanceFailureClusters(results: RepositoryExecutionResult[]): GovernanceFailureCluster[] {
    const failedResults = results.filter((r) => r.governanceRejectionRate !== undefined && r.governanceRejectionRate > 0);
    const clusterMap = new Map<string, { count: number; affectedRepositories: string[] }>();

    for (const result of failedResults) {
      const reason = `governance rejection rate: ${(result.governanceRejectionRate! * 100).toFixed(1)}%`;
      const existing = clusterMap.get(reason) ?? { count: 0, affectedRepositories: [] };
      existing.count++;
      if (!existing.affectedRepositories.includes(result.repoPath)) {
        existing.affectedRepositories.push(result.repoPath);
      }
      clusterMap.set(reason, existing);
    }

    return [...clusterMap.entries()]
      .map(([reason, data]) => ({
        reason,
        count: data.count,
        affectedRepositories: data.affectedRepositories.sort(),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private computeRuntimeInstabilityClusters(results: RepositoryExecutionResult[]): RuntimeInstabilityCluster[] {
    const unstableResults = results.filter((r) => r.replayInstability);
    const typeMap = new Map<string, { count: number; affectedRepositories: string[] }>();

    for (const result of unstableResults) {
      const type = 'replay-instability';
      const existing = typeMap.get(type) ?? { count: 0, affectedRepositories: [] };
      existing.count++;
      if (!existing.affectedRepositories.includes(result.repoPath)) {
        existing.affectedRepositories.push(result.repoPath);
      }
      typeMap.set(type, existing);
    }

    return [...typeMap.entries()]
      .map(([type, data]) => ({
        type,
        count: data.count,
        affectedRepositories: data.affectedRepositories.sort(),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private computePerformanceBottlenecks(results: RepositoryExecutionResult[]): PerformanceBottleneck[] {
    const resultsWithDuration = results.filter((r) => r.executionDurationMs !== undefined);
    if (resultsWithDuration.length === 0) return [];

    const stageMap = new Map<string, { durations: number[]; affectedRepositories: string[] }>();

    for (const result of resultsWithDuration) {
      const stage = 'validation';
      const existing = stageMap.get(stage) ?? { durations: [], affectedRepositories: [] };
      existing.durations.push(result.executionDurationMs!);
      if (!existing.affectedRepositories.includes(result.repoPath)) {
        existing.affectedRepositories.push(result.repoPath);
      }
      stageMap.set(stage, existing);
    }

    return [...stageMap.entries()]
      .map(([stage, data]) => {
        const avgDurationMs = Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length);
        const maxDurationMs = Math.max(...data.durations);
        return {
          stage,
          avgDurationMs,
          maxDurationMs,
          affectedRepositories: data.affectedRepositories.sort(),
        };
      })
      .sort((a, b) => b.avgDurationMs - a.avgDurationMs);
  }

  private computeRepositoryTypeCorrelation(results: RepositoryExecutionResult[]): RepositoryTypeCorrelation[] {
    const categoryMap = new Map<string, RepositoryExecutionResult[]>();

    for (const result of results) {
      const category = result.category;
      const existing = categoryMap.get(category) ?? [];
      existing.push(result);
      categoryMap.set(category, existing);
    }

    return [...categoryMap.entries()]
      .map(([category, categoryResults]) => {
        const completedResults = categoryResults.filter((r) => r.status === 'completed');
        const failedResults = categoryResults.filter((r) => r.status === 'failed');

        const avgCompatibilityScore = completedResults.length > 0
          ? completedResults.reduce((sum, r) => {
              const score = r.validationReport?.stabilityMetrics.overallCompatibilityScore ?? 0;
              return sum + score;
            }, 0) / completedResults.length
          : 0;

        const avgParserSurvivability = completedResults.length > 0
          ? completedResults.reduce((sum, r) => sum + (r.parserSurvivability ?? 0), 0) / completedResults.length
          : 0;

        const avgCompileStability = completedResults.length > 0
          ? completedResults.reduce((sum, r) => sum + (r.compileStability ?? 0), 0) / completedResults.length
          : 0;

        const failureRate = categoryResults.length > 0
          ? failedResults.length / categoryResults.length
          : 0;

        return {
          category,
          avgCompatibilityScore,
          avgParserSurvivability,
          avgCompileStability,
          failureRate,
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category));
  }

  private computeFailureHotspots(failedResults: RepositoryExecutionResult[]): FailureHotspot[] {
    return failedResults
      .map((result) => ({
        repository: result.name,
        category: result.category,
        failureReasons: [result.error ?? 'unknown'],
        severity: this.computeSeverity(result),
      }))
      .sort((a, b) => a.repository.localeCompare(b.repository));
  }

  private computeSeverity(result: RepositoryExecutionResult): 'low' | 'medium' | 'high' | 'critical' {
    if (result.error?.includes('critical')) return 'critical';
    if (result.error?.includes('incompatible')) return 'high';
    if (result.error?.includes('unsupported')) return 'medium';
    return 'low';
  }

  private computeRecoveryMetrics(results: RepositoryExecutionResult[]): RecoveryMetric[] {
    const completedResults = results.filter((r) => r.status === 'completed');
    if (completedResults.length === 0) return [];

    const metrics: RecoveryMetric[] = [];

    const parserSurvivabilityValues = completedResults.map((r) => r.parserSurvivability ?? 0).filter((v) => v > 0);
    if (parserSurvivabilityValues.length > 0) {
      metrics.push({
        metric: 'parser-survivability',
        avgValue: this.avg(parserSurvivabilityValues),
        minValue: Math.min(...parserSurvivabilityValues),
        maxValue: Math.max(...parserSurvivabilityValues),
        repositoryCount: parserSurvivabilityValues.length,
      });
    }

    const compileStabilityValues = completedResults.map((r) => r.compileStability ?? 0).filter((v) => v > 0);
    if (compileStabilityValues.length > 0) {
      metrics.push({
        metric: 'compile-stability',
        avgValue: this.avg(compileStabilityValues),
        minValue: Math.min(...compileStabilityValues),
        maxValue: Math.max(...compileStabilityValues),
        repositoryCount: compileStabilityValues.length,
      });
    }

    const healingRecoveryValues = completedResults.map((r) => r.healingRecoveryRate ?? 0).filter((v) => v > 0);
    if (healingRecoveryValues.length > 0) {
      metrics.push({
        metric: 'healing-recovery-rate',
        avgValue: this.avg(healingRecoveryValues),
        minValue: Math.min(...healingRecoveryValues),
        maxValue: Math.max(...healingRecoveryValues),
        repositoryCount: healingRecoveryValues.length,
      });
    }

    return metrics;
  }

  private avg(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1000) / 1000;
  }
}
