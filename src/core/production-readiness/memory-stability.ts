/**
 * Memory Stability
 *
 * Detects excessive snapshot accumulation, large replay payloads,
 * oversized patch/audit reports, and measures repository scaling behavior.
 *
 * Reuses: UnifiedExecutionReport, RepositoryValidationReport
 * No Date.now(). No Math.random(). Deterministic only.
 */

import type { MemoryStabilityReport } from './types.js';
import type { UnifiedExecutionReport } from '../unified-runtime/types.js';
import type { RepositoryValidationReport } from '../repository-validator/types.js';

const SNAPSHOT_THRESHOLD = 100;
const PAYLOAD_THRESHOLD = 50;
const REPORT_SIZE_THRESHOLD = 10000;
const SCALING_EFFICIENT_RATIO = 5;
const SCALING_MODERATE_RATIO = 10;

let stabilityCounter = 0;
function nextStabilityId(): string {
  stabilityCounter++;
  return `memory-stability-${stabilityCounter}`;
}

export class MemoryStability {
  analyze(
    repoPath: string,
    executionReport: UnifiedExecutionReport,
    repoReport: RepositoryValidationReport,
  ): MemoryStabilityReport {
    const reportId = nextStabilityId();

    const fileCount = repoReport.parserResults.totalFiles;
    const locatorCount = repoReport.locatorPatternStats.totalLocators;

    const scalingEfficiency = this.computeScalingEfficiency(fileCount, locatorCount);

    return {
      reportId,
      repoPath,
      snapshotAccumulation: {
        totalSnapshots: this.countSnapshots(executionReport),
        avgSnapshotSize: this.estimateSnapshotSize(executionReport),
        excessiveAccumulation: this.countSnapshots(executionReport) > SNAPSHOT_THRESHOLD,
      },
      replayPayloads: {
        totalPayloads: this.countReplayPayloads(executionReport),
        avgPayloadSize: this.estimatePayloadSize(executionReport),
        oversizedPayloads: this.countOversizedPayloads(executionReport),
      },
      patchAuditReports: {
        totalReports: this.countPatchAuditReports(executionReport),
        avgReportSize: this.estimateReportSize(executionReport),
        oversizedReports: this.countOversizedReports(executionReport),
      },
      repositoryScaling: {
        fileCount,
        locatorCount,
        scalingEfficiency,
      },
      generatedAt: 0,
    };
  }

  private countSnapshots(executionReport: UnifiedExecutionReport): number {
    return executionReport.runtimeMetrics.domStabilizationSuccessRate > 0
      ? executionReport.validationOutcomes.totalValidations
      : 0;
  }

  private estimateSnapshotSize(executionReport: UnifiedExecutionReport): number {
    const validations = executionReport.validationOutcomes.totalValidations;
    if (validations === 0) return 0;
    return Math.round(validations * 500);
  }

  private countReplayPayloads(executionReport: UnifiedExecutionReport): number {
    return executionReport.replayStability.replayDeterministic
      ? executionReport.validationOutcomes.passed
      : executionReport.validationOutcomes.totalValidations;
  }

  private estimatePayloadSize(executionReport: UnifiedExecutionReport): number {
    const payloads = this.countReplayPayloads(executionReport);
    if (payloads === 0) return 0;
    return Math.round(payloads * 200);
  }

  private countOversizedPayloads(executionReport: UnifiedExecutionReport): number {
    const size = this.estimatePayloadSize(executionReport);
    return size > PAYLOAD_THRESHOLD ? 1 : 0;
  }

  private countPatchAuditReports(executionReport: UnifiedExecutionReport): number {
    return executionReport.patchProposals.totalProposals;
  }

  private estimateReportSize(executionReport: UnifiedExecutionReport): number {
    const proposals = executionReport.patchProposals.totalProposals;
    if (proposals === 0) return 0;
    return Math.round(proposals * 1000);
  }

  private countOversizedReports(executionReport: UnifiedExecutionReport): number {
    const size = this.estimateReportSize(executionReport);
    return size > REPORT_SIZE_THRESHOLD ? 1 : 0;
  }

  private computeScalingEfficiency(fileCount: number, locatorCount: number): 'efficient' | 'moderate' | 'inefficient' {
    if (fileCount === 0) return 'efficient';
    const ratio = locatorCount / fileCount;
    if (ratio <= SCALING_EFFICIENT_RATIO) return 'efficient';
    if (ratio <= SCALING_MODERATE_RATIO) return 'moderate';
    return 'inefficient';
  }
}
