/**
 * Replay Evidence Renderer
 *
 * Renders replay path summary, navigation flow, divergence evidence,
 * replay recovery attempts, and unstable execution warnings.
 *
 * Reuses: RuntimeValidationResult, ReplayDivergence
 */

import type { ReplayEvidenceReport } from './types.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';

export class ReplayEvidenceRenderer {
  render(runtimeResult: RuntimeValidationResult): ReplayEvidenceReport {
    const reviewId = `replay-${runtimeResult.id}`;

    const successfulSteps = runtimeResult.executedStepCount - runtimeResult.replayDivergence.length;
    const failedSteps = runtimeResult.replayDivergence.length;

    const navigationFlow = this.extractNavigationFlow(runtimeResult);
    const divergenceEvidence = runtimeResult.replayDivergence.map((div) => ({
      type: div.type,
      stepIndex: div.stepIndex,
      expected: div.expected,
      actual: div.actual,
      severity: this.computeDivergenceSeverity(div),
    }));

    const unstableExecutionWarnings = this.detectUnstableWarnings(runtimeResult);

    const renderedEvidence = this.renderEvidence({
      reviewId,
      replayPathSummary: {
        totalSteps: runtimeResult.totalStepCount,
        successfulSteps,
        failedSteps,
        divergedSteps: runtimeResult.replayDivergence.length,
      },
      navigationFlow,
      divergenceEvidence,
      replayRecoveryAttempts: this.countRecoveryAttempts(runtimeResult),
      unstableExecutionWarnings,
    });

    return {
      reviewId,
      replayPathSummary: {
        totalSteps: runtimeResult.totalStepCount,
        successfulSteps,
        failedSteps,
        divergedSteps: runtimeResult.replayDivergence.length,
      },
      navigationFlow,
      divergenceEvidence,
      replayRecoveryAttempts: this.countRecoveryAttempts(runtimeResult),
      unstableExecutionWarnings,
      renderedEvidence,
    };
  }

  private extractNavigationFlow(runtimeResult: RuntimeValidationResult): string[] {
    const urls: string[] = [];
    for (const evidence of runtimeResult.runtimeEvidence) {
      if (urls.length === 0 || urls[urls.length - 1] !== evidence.url) {
        urls.push(evidence.url);
      }
    }
    return urls;
  }

  private computeDivergenceSeverity(div: RuntimeValidationResult['replayDivergence'][number]): string {
    if (div.type === 'url-mismatch') return 'high';
    if (div.type === 'element-missing') return 'medium';
    if (div.type === 'interaction-failed') return 'medium';
    if (div.type === 'dialog-mismatch') return 'low';
    if (div.type === 'frame-mismatch') return 'medium';
    return 'low';
  }

  private countRecoveryAttempts(runtimeResult: RuntimeValidationResult): number {
    let attempts = 0;
    for (const indicator of runtimeResult.falsePositiveIndicators) {
      if (indicator.type === 'unstable-dynamic' || indicator.type === 'hierarchy-mismatch') {
        attempts++;
      }
    }
    return attempts;
  }

  private detectUnstableWarnings(runtimeResult: RuntimeValidationResult): string[] {
    const warnings: string[] = [];

    if (runtimeResult.replayDivergence.length > 0) {
      warnings.push(`${runtimeResult.replayDivergence.length} replay divergence(s) detected`);
    }

    for (const indicator of runtimeResult.falsePositiveIndicators) {
      if (indicator.type === 'hidden-element') {
        warnings.push(`Hidden element at step ${indicator.stepIndex}`);
      }
      if (indicator.type === 'detached-element') {
        warnings.push(`Detached element at step ${indicator.stepIndex}`);
      }
      if (indicator.type === 'unstable-dynamic') {
        warnings.push(`Unstable dynamic content at step ${indicator.stepIndex}`);
      }
    }

    return warnings;
  }

  private renderEvidence(report: Omit<ReplayEvidenceReport, 'renderedEvidence'>): string {
    const lines: string[] = [];

    lines.push('=== Replay Evidence Report ===');
    lines.push('');
    lines.push(`Replay ID: ${report.reviewId}`);
    lines.push('');
    lines.push('Replay Path Summary:');
    lines.push(`  Total steps:     ${report.replayPathSummary.totalSteps}`);
    lines.push(`  Successful:      ${report.replayPathSummary.successfulSteps}`);
    lines.push(`  Failed:          ${report.replayPathSummary.failedSteps}`);
    lines.push(`  Diverged:        ${report.replayPathSummary.divergedSteps}`);
    lines.push('');

    if (report.navigationFlow.length > 0) {
      lines.push('Navigation Flow:');
      for (const url of report.navigationFlow) {
        lines.push(`  -> ${url}`);
      }
      lines.push('');
    }

    if (report.divergenceEvidence.length > 0) {
      lines.push('Divergence Evidence:');
      for (const div of report.divergenceEvidence) {
        lines.push(`  [${div.severity.toUpperCase()}] Step ${div.stepIndex}: ${div.type}`);
        lines.push(`    Expected: ${div.expected}`);
        lines.push(`    Actual:   ${div.actual}`);
      }
      lines.push('');
    }

    lines.push(`Recovery attempts: ${report.replayRecoveryAttempts}`);
    lines.push('');

    if (report.unstableExecutionWarnings.length > 0) {
      lines.push('Unstable Execution Warnings:');
      for (const warning of report.unstableExecutionWarnings) {
        lines.push(`  ! ${warning}`);
      }
    }

    return lines.join('\n');
  }
}
