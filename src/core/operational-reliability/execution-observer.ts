/**
 * Execution Observer
 *
 * Observes UnifiedRuntime executions and collects metrics for
 * reliability measurement. No modification of execution flow.
 *
 * No AI. No autonomous behavior. Pure observation.
 */

import type { UnifiedExecutionReport } from '../unified-runtime/types.js';
import type { RuntimeStabilityMetrics } from '../runtime-hardening/types.js';
import type { RuntimeHealingMetrics } from '../runtime-healing-loop/types.js';
import type { ReliabilityRun } from './types.js';

let runCounter = 0;
function nextRunId(): string {
  runCounter++;
  return `reliability-run-${runCounter}`;
}

export class ExecutionObserver {
  /**
   * Observe a single execution and produce a ReliabilityRun record.
   */
  observe(
    iteration: number,
    repoPath: string,
    report: UnifiedExecutionReport,
    error?: string,
  ): ReliabilityRun {
    return {
      runId: nextRunId(),
      iteration,
      repoPath,
      status: error ? 'failed' : (report.stateTransitions.finalState === 'completed' ? 'completed' : 'partial'),
      executionReport: report,
      healingMetrics: this.extractHealingMetrics(report),
      stabilityMetrics: this.extractStabilityMetrics(report),
      error,
      completedAt: report.completedAt,
    };
  }

  /**
   * Extract healing metrics from a unified execution report.
   */
  extractHealingMetrics(report: UnifiedExecutionReport): RuntimeHealingMetrics {
    return {
      totalHealingAttempts: report.healingSummary.totalAttempts,
      successfulHealings: report.healingSummary.successfulHealings,
      sandboxReplaySuccesses: report.sandboxVerification.compileSuccess ? 1 : 0,
      falseRecoveries: 0,
      replayDivergences: report.replayStability.driftSeverity === 'none' ? 0 : 1,
      rollbackReliability: report.rollbackMetadata.rollbackAvailable ? 1 : 0,
      patchSurvivability: report.sandboxVerification.compileSuccess ? 1 : 0,
    };
  }

  /**
   * Extract stability metrics from a unified execution report.
   */
  extractStabilityMetrics(report: UnifiedExecutionReport): RuntimeStabilityMetrics {
    return {
      domStabilizationSuccessRate: report.replayStability.domStabilized ? 1 : 0,
      replayRecoverySuccess: report.replayStability.replayDeterministic ? 1 : 0,
      staleRecoverySuccess: 1,
      iframeRecoveryRate: 1,
      asyncRenderInstabilityFrequency: report.runtimeMetrics.asyncRenderInstabilityFrequency,
      replayDriftFrequency: report.runtimeMetrics.replayDriftFrequency,
      totalSessionsAnalyzed: 1,
      stableSessions: report.replayStability.domStabilized && report.replayStability.replayDeterministic ? 1 : 0,
      unstableSessions: report.replayStability.domStabilized && report.replayStability.replayDeterministic ? 0 : 1,
    };
  }
}
