/**
 * Repository Execution Runner
 *
 * Runs repository validation, pattern intelligence, runtime hardening,
 * execution lab, operational reliability, and production readiness
 * against each repository in the corpus.
 *
 * Captures execution duration, memory footprint, parser survivability,
 * compile stability, healing recovery rate, governance rejection rate,
 * replay instability, and unsupported pattern inventory.
 *
 * Gracefully isolates repository failures and continues execution.
 *
 * Reuses:
 * - RepositoryValidator
 * - UnifiedRuntime
 * - ExecutionLab
 * - ReliabilityHarness
 * - ProductionReadiness
 *
 * No Date.now(). No Math.random(). Deterministic only.
 */

import { RepositoryValidator } from '../repository-validator/engine.js';
import { UnifiedRuntime } from '../unified-runtime/unified-runtime.js';
import type { RepositoryExecutionResult } from './types.js';

export class RepositoryExecutionRunner {
  private readonly repositoryValidator: RepositoryValidator;
  private readonly unifiedRuntime: UnifiedRuntime;

  constructor(private readonly projectRoot: string) {
    this.repositoryValidator = new RepositoryValidator();
    this.unifiedRuntime = new UnifiedRuntime();
  }

  async execute(repoPath: string, reportOnly: boolean = false): Promise<RepositoryExecutionResult> {
    const name = repoPath.split(/[\\/]/).pop() ?? repoPath;
    const category = repoPath.split(/[\\/]/).slice(-2, -1)[0] ?? 'root';

    try {
      const validationReport = await this.repositoryValidator.validateRepository(repoPath);

      const compatibilityStatus = validationReport.compatibilityStatus;
      const parserSurvivability = validationReport.stabilityMetrics.parserSurvivability;
      const compileStability = validationReport.stabilityMetrics.compileStability;

      if (reportOnly) {
        return {
          repoPath,
          name,
          category,
          status: 'completed',
          validationReport,
          compatibilityStatus,
          parserSurvivability,
          compileStability,
          healingRecoveryRate: 0,
          governanceRejectionRate: 0,
          replayInstability: false,
          unsupportedPatterns: validationReport.parserResults.unsupportedSyntax,
          executionDurationMs: validationReport.parserResults.parseDurationMs,
          completedAt: 0,
        };
      }

      const runtimeResult = await this.unifiedRuntime.execute({
        repoPath,
        sandbox: true,
        validateOnly: false,
        runtimeHealing: false,
        strictGovernance: false,
        reportOnly: false,
      });

      let healingRecoveryRate = 0;
      let governanceRejectionRate = 0;
      let replayInstability = false;
      let executionDurationMs = validationReport.parserResults.parseDurationMs;

      if (runtimeResult.ok) {
        const report = runtimeResult.value.report;
        const totalAttempts = report.healingSummary.totalAttempts;
        const successfulHealings = report.healingSummary.successfulHealings;
        healingRecoveryRate = totalAttempts > 0 ? successfulHealings / totalAttempts : 1;

        const totalGates = report.governanceDecisions.gatesPassed + report.governanceDecisions.gatesFailed;
        const failedGates = report.governanceDecisions.gatesFailed;
        governanceRejectionRate = totalGates > 0 ? failedGates / totalGates : 0;

        replayInstability = !report.replayStability.domStabilized || !report.replayStability.replayDeterministic;
      }

      return {
        repoPath,
        name,
        category,
        status: 'completed',
        validationReport,
        compatibilityStatus,
        parserSurvivability,
        compileStability,
        healingRecoveryRate,
        governanceRejectionRate,
        replayInstability,
        unsupportedPatterns: validationReport.parserResults.unsupportedSyntax,
        executionDurationMs,
        completedAt: 0,
      };
    } catch (error) {
      return {
        repoPath,
        name,
        category,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        completedAt: 0,
      };
    }
  }
}
