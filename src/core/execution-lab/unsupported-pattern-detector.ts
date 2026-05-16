/**
 * Unsupported Pattern Detector
 *
 * Detects operationally unsupported structures:
 * - wrapper-heavy abstractions
 * - dynamic selector factories
 * - unstable async flows
 * - framework-specific unsupported APIs
 * - deep iframe/modal nesting
 *
 * Reuses: ExecutionBatchReport, RepositoryExecutionResult
 */

import type {
  ExecutionBatchReport,
  UnsupportedPatternInventory,
  UnsupportedPattern,
  UnsupportedPatternType,
  RepositoryExecutionResult,
} from './types.js';

let patternCounter = 0;
function nextPatternId(): string {
  patternCounter++;
  return `pattern-${patternCounter}`;
}

export class UnsupportedPatternDetector {
  detect(batchReport: ExecutionBatchReport): UnsupportedPatternInventory {
    const patterns: UnsupportedPattern[] = [];

    const resultsByRepo = this.groupByRepo(batchReport.results);

    for (const [repoPath, results] of resultsByRepo) {
      const wrapperPatterns = this.detectWrapperHeavyAbstraction(repoPath, results);
      if (wrapperPatterns) patterns.push(wrapperPatterns);

      const dynamicSelectorPatterns = this.detectDynamicSelectorFactory(repoPath, results);
      if (dynamicSelectorPatterns) patterns.push(dynamicSelectorPatterns);

      const asyncFlowPatterns = this.detectUnstableAsyncFlow(repoPath, results);
      if (asyncFlowPatterns) patterns.push(asyncFlowPatterns);

      const unsupportedApiPatterns = this.detectFrameworkUnsupportedApi(repoPath, results);
      if (unsupportedApiPatterns) patterns.push(unsupportedApiPatterns);

      const deepNestingPatterns = this.detectDeepIframeModalNesting(repoPath, results);
      if (deepNestingPatterns) patterns.push(deepNestingPatterns);
    }

    const byType = this.countByType(patterns);

    return {
      batchId: batchReport.batchId,
      patterns,
      totalPatterns: patterns.length,
      byType,
      generatedAt: 0,
    };
  }

  private groupByRepo(
    results: RepositoryExecutionResult[],
  ): Map<string, RepositoryExecutionResult[]> {
    const map = new Map<string, RepositoryExecutionResult[]>();
    for (const result of results) {
      const existing = map.get(result.repoPath) ?? [];
      existing.push(result);
      map.set(result.repoPath, existing);
    }
    return map;
  }

  private detectWrapperHeavyAbstraction(
    repoPath: string,
    results: RepositoryExecutionResult[],
  ): UnsupportedPattern | null {
    const failedResults = results.filter((r) => !r.success && r.error?.includes('wrapper'));
    if (failedResults.length === 0) return null;

    return {
      patternId: nextPatternId(),
      type: 'wrapper-heavy-abstraction',
      description: 'Repository uses heavy wrapper abstractions that prevent reliable test execution',
      repoPath,
      affectedFiles: failedResults.map((r) => r.repoPath),
      frequency: failedResults.length,
      severity: failedResults.length > 2 ? 'high' : 'medium',
      example: 'Wrapper-heavy abstraction detected in test files',
    };
  }

  private detectDynamicSelectorFactory(
    repoPath: string,
    results: RepositoryExecutionResult[],
  ): UnsupportedPattern | null {
    const healingFailures = results.filter(
      (r) => r.report && r.report.healingSummary.totalAttempts > 0 && r.report.healingSummary.successfulHealings === 0,
    );
    if (healingFailures.length === 0) return null;

    return {
      patternId: nextPatternId(),
      type: 'dynamic-selector-factory',
      description: 'Dynamic selector factory patterns prevent reliable healing',
      repoPath,
      affectedFiles: healingFailures.map((r) => r.repoPath),
      frequency: healingFailures.length,
      severity: healingFailures.length > 2 ? 'high' : 'medium',
      example: 'Dynamic selector factory detected in test files',
    };
  }

  private detectUnstableAsyncFlow(
    repoPath: string,
    results: RepositoryExecutionResult[],
  ): UnsupportedPattern | null {
    const unstableResults = results.filter((r) => r.runtimeInstability);
    if (unstableResults.length === 0) return null;

    return {
      patternId: nextPatternId(),
      type: 'unstable-async-flow',
      description: 'Unstable async flows cause runtime instability',
      repoPath,
      affectedFiles: unstableResults.map((r) => r.repoPath),
      frequency: unstableResults.length,
      severity: unstableResults.length > 2 ? 'high' : 'medium',
      example: 'Unstable async flow detected in test execution',
    };
  }

  private detectFrameworkUnsupportedApi(
    repoPath: string,
    results: RepositoryExecutionResult[],
  ): UnsupportedPattern | null {
    const unsupportedResults = results.filter(
      (r) => r.report && r.report.frameworkType === 'unknown',
    );
    if (unsupportedResults.length === 0) return null;

    return {
      patternId: nextPatternId(),
      type: 'framework-unsupported-api',
      description: 'Framework-specific unsupported APIs detected',
      repoPath,
      affectedFiles: unsupportedResults.map((r) => r.repoPath),
      frequency: unsupportedResults.length,
      severity: unsupportedResults.length > 2 ? 'high' : 'medium',
      example: 'Unsupported framework API detected in test files',
    };
  }

  private detectDeepIframeModalNesting(
    repoPath: string,
    results: RepositoryExecutionResult[],
  ): UnsupportedPattern | null {
    const replayFailures = results.filter((r) => r.replayFailures > 0);
    if (replayFailures.length === 0) return null;

    return {
      patternId: nextPatternId(),
      type: 'deep-iframe-modal-nesting',
      description: 'Deep iframe/modal nesting causes replay failures',
      repoPath,
      affectedFiles: replayFailures.map((r) => r.repoPath),
      frequency: replayFailures.length,
      severity: replayFailures.length > 2 ? 'high' : 'medium',
      example: 'Deep iframe/modal nesting detected in test execution',
    };
  }

  private countByType(patterns: UnsupportedPattern[]): Record<UnsupportedPatternType, number> {
    const types: UnsupportedPatternType[] = [
      'wrapper-heavy-abstraction',
      'dynamic-selector-factory',
      'unstable-async-flow',
      'framework-unsupported-api',
      'deep-iframe-modal-nesting',
    ];

    const counts: Record<string, number> = {};
    for (const type of types) {
      counts[type] = 0;
    }
    for (const pattern of patterns) {
      counts[pattern.type] = (counts[pattern.type] ?? 0) + 1;
    }

    return counts as Record<UnsupportedPatternType, number>;
  }
}
