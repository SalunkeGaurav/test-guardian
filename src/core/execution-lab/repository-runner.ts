/**
 * Repository Runner
 *
 * Runs UnifiedRuntime against a single repository and collects
 * execution outcomes, healing attempts, governance decisions,
 * replay failures, sandbox verification, and runtime instability.
 *
 * Reuses: UnifiedRuntime
 */

import { UnifiedRuntime } from '../unified-runtime/unified-runtime.js';
import type { RepositoryExecutionResult } from './types.js';

let executionCounter = 0;
function nextExecutionId(): string {
  executionCounter++;
  return `exec-${executionCounter}`;
}

export class RepositoryRunner {
  private readonly unifiedRuntime: UnifiedRuntime;

  constructor() {
    this.unifiedRuntime = new UnifiedRuntime();
  }

  async run(
    repoPath: string,
    iteration: number,
    reportOnly: boolean = false,
  ): Promise<RepositoryExecutionResult> {
    const executionId = nextExecutionId();
    const executedAt = 0;

    try {
      const result = await this.unifiedRuntime.execute({
        repoPath,
        sandbox: true,
        validateOnly: false,
        runtimeHealing: true,
        strictGovernance: false,
        reportOnly,
      });

      if (result.ok) {
        const report = result.value.report;
        return {
          repoPath,
          executionId,
          iteration,
          success: true,
          report,
          error: null,
          healingAttempts: report.healingSummary.totalAttempts,
          successfulHealings: report.healingSummary.successfulHealings,
          governanceDecisions: report.governanceDecisions.gatesPassed + report.governanceDecisions.gatesFailed,
          replayFailures: report.replayStability.domStabilized && report.replayStability.replayDeterministic ? 0 : 1,
          sandboxVerified: report.sandboxVerification.sandboxExecuted && report.sandboxVerification.compileSuccess,
          runtimeInstability: report.runtimeMetrics.domStabilizationSuccessRate < 1 || report.runtimeMetrics.replayRecoverySuccess < 1,
          executedAt,
        };
      } else {
        return {
          repoPath,
          executionId,
          iteration,
          success: false,
          report: null,
          error: result.error,
          healingAttempts: 0,
          successfulHealings: 0,
          governanceDecisions: 0,
          replayFailures: 1,
          sandboxVerified: false,
          runtimeInstability: true,
          executedAt,
        };
      }
    } catch (error) {
      return {
        repoPath,
        executionId,
        iteration,
        success: false,
        report: null,
        error: error instanceof Error ? error.message : String(error),
        healingAttempts: 0,
        successfulHealings: 0,
        governanceDecisions: 0,
        replayFailures: 1,
        sandboxVerified: false,
        runtimeInstability: true,
        executedAt,
      };
    }
  }
}
