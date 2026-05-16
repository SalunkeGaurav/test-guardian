/**
 * Report Aggregator
 *
 * Generates a single consolidated UnifiedExecutionReport from all
 * stage results. Persists to .testguardian/unified-runtime/.
 *
 * No AI. No new analysis. Pure aggregation of existing results.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { UnifiedExecutionReport, ExecutionStateTransitionReport, FailureBoundaryReport } from './types.js';
import type { RuntimeContext } from './types.js';

const UNIFIED_RUNTIME_STORAGE_DIR = 'unified-runtime';

let reportCounter = 0;
function nextExecutionId(): string {
  reportCounter++;
  return `unified-exec-${reportCounter}`;
}

export class ReportAggregator {
  /**
   * Generate a consolidated execution report from the runtime context.
   */
  aggregate(
    context: RuntimeContext,
    stateReport: ExecutionStateTransitionReport,
    failureReport: FailureBoundaryReport,
  ): UnifiedExecutionReport {
    const repoReport = context.repositoryReport;
    const hardeningResult = context.hardeningResult;
    const healingResult = context.healingResult;
    const governanceResult = context.governanceResult;
    const sandboxResult = context.sandboxResult;
    const validationResults = context.validationResults ?? [];

    const passedValidations = validationResults.filter(v => v.status === 'passed').length;
    const failedValidations = validationResults.filter(v => v.status === 'failed').length;

    const gatesPassed = governanceResult?.gates.filter(g => g.passed).length ?? 0;
    const gatesFailed = governanceResult?.gates.filter(g => !g.passed).length ?? 0;

    const riskFactors = this.computeRiskFactors(context, failureReport);
    const overallRisk = this.computeOverallRisk(riskFactors);

    const report: UnifiedExecutionReport = {
      executionId: context.executionId || nextExecutionId(),
      repoPath: context.repoPath,
      frameworkType: context.frameworkType,
      compatibilityStatus: context.compatibilityStatus,
      repositorySummary: {
        totalFiles: repoReport?.parserResults.totalFiles ?? 0,
        totalLocators: repoReport?.locatorPatternStats.totalLocators ?? 0,
        compatibilityScore: repoReport?.stabilityMetrics.overallCompatibilityScore ?? 0,
        risks: repoReport?.architecturalRisks.length ?? 0,
      },
      healingSummary: {
        totalAttempts: healingResult?.metrics.totalHealingAttempts ?? 0,
        successfulHealings: healingResult?.metrics.successfulHealings ?? 0,
        reviewPackages: context.reviewPackage ? 1 : 0,
      },
      validationOutcomes: {
        totalValidations: validationResults.length,
        passed: passedValidations,
        failed: failedValidations,
      },
      replayStability: {
        domStabilized: hardeningResult?.domSettling.status === 'stable',
        replayDeterministic: hardeningResult?.replayDrift.replayDeterministic ?? false,
        driftSeverity: hardeningResult?.replayDrift.driftSeverity ?? 'none',
      },
      governanceDecisions: {
        governancePassed: governanceResult?.passed ?? false,
        gatesPassed,
        gatesFailed,
      },
      sandboxVerification: {
        sandboxExecuted: sandboxResult !== undefined,
        compileSuccess: sandboxResult?.report.compileResult.success ?? false,
        isolationVerified: sandboxResult?.report.rollbackResult?.success ?? false,
      },
      patchProposals: {
        totalProposals: healingResult?.reviewPackage ? 1 : 0,
        status: healingResult?.reviewPackage?.status ?? 'none',
      },
      rollbackMetadata: {
        rollbackAvailable: healingResult?.reviewPackage?.rollbackMetadata !== undefined,
        rollbackCode: healingResult?.reviewPackage?.rollbackMetadata?.patchReversalCode,
      },
      riskAnalysis: {
        overallRisk,
        riskFactors,
      },
      runtimeMetrics: {
        domStabilizationSuccessRate: hardeningResult?.metrics.domStabilizationSuccessRate ?? 0,
        replayRecoverySuccess: hardeningResult?.metrics.replayRecoverySuccess ?? 0,
        staleRecoverySuccess: hardeningResult?.metrics.staleRecoverySuccess ?? 0,
        iframeRecoveryRate: hardeningResult?.metrics.iframeRecoveryRate ?? 0,
        asyncRenderInstabilityFrequency: hardeningResult?.metrics.asyncRenderInstabilityFrequency ?? 0,
        replayDriftFrequency: hardeningResult?.metrics.replayDriftFrequency ?? 0,
      },
      stateTransitions: stateReport,
      failureBoundary: failureReport,
      persistedPaths: [],
      completedAt: 0,
    };

    return report;
  }

  /**
   * Persist the report to .testguardian/unified-runtime/.
   */
  persist(report: UnifiedExecutionReport, projectRoot: string): string[] {
    const paths: string[] = [];

    try {
      const outputDir = join(projectRoot, '.testguardian', UNIFIED_RUNTIME_STORAGE_DIR);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const reportPath = join(outputDir, `${report.executionId}.json`);
      writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      paths.push(reportPath);

      const summaryPath = join(outputDir, `${report.executionId}-summary.json`);
      writeFileSync(summaryPath, JSON.stringify({
        executionId: report.executionId,
        repoPath: report.repoPath,
        compatibilityStatus: report.compatibilityStatus,
        overallRisk: report.riskAnalysis.overallRisk,
        healingSuccessRate: report.healingSummary.totalAttempts > 0
          ? report.healingSummary.successfulHealings / report.healingSummary.totalAttempts
          : 0,
        governancePassed: report.governanceDecisions.governancePassed,
        sandboxVerified: report.sandboxVerification.sandboxExecuted,
        replayDeterministic: report.replayStability.replayDeterministic,
      }, null, 2), 'utf-8');
      paths.push(summaryPath);
    } catch {
    }

    return paths;
  }

  private computeRiskFactors(
    context: RuntimeContext,
    failureReport: FailureBoundaryReport,
  ): string[] {
    const factors: string[] = [];

    if (context.compatibilityStatus === 'partially-supported') {
      factors.push('Partial repository compatibility');
    }
    if (context.compatibilityStatus === 'unsupported') {
      factors.push('Repository not compatible');
    }
    if (context.hardeningResult && !context.hardeningResult.overallStable) {
      factors.push('Runtime instability detected');
    }
    if (context.hardeningResult?.replayDrift.driftSeverity === 'high' || context.hardeningResult?.replayDrift.driftSeverity === 'critical') {
      factors.push(`Replay drift severity: ${context.hardeningResult.replayDrift.driftSeverity}`);
    }
    if (context.governanceResult && !context.governanceResult.passed) {
      factors.push('Governance gates failed');
    }
    if (failureReport.unrecoverableFailures > 0) {
      factors.push(`${failureReport.unrecoverableFailures} unrecoverable failure(s)`);
    }
    if (context.repositoryReport && context.repositoryReport.architecturalRisks.length > 0) {
      const highRisks = context.repositoryReport.architecturalRisks.filter(r => r.severity === 'high');
      if (highRisks.length > 0) {
        factors.push(`${highRisks.length} high-severity architectural risk(s)`);
      }
    }

    return factors;
  }

  private computeOverallRisk(factors: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (factors.length === 0) return 'low';
    if (factors.length === 1) return 'medium';
    if (factors.length <= 3) return 'high';
    return 'critical';
  }
}
