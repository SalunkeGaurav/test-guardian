/**
 * Mutation Risk Visualizer
 *
 * Renders selector instability, replay fragility, structural mutation risk,
 * async instability, and iframe/modal instability for developer review.
 *
 * Reuses: RuntimeHardeningResult, RuntimeValidationResult, PatchProposal
 */

import type { MutationRiskVisualization } from './types.js';
import type { RuntimeHardeningResult } from '../runtime-hardening/types.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';
import type { PatchProposal } from '../../models/patch.js';

export class MutationRiskVisualizer {
  visualize(
    hardeningResult: RuntimeHardeningResult,
    runtimeResult: RuntimeValidationResult,
    patchProposal: PatchProposal,
  ): MutationRiskVisualization {
    const reviewId = `risk-${patchProposal.patchId}`;

    const selectorInstability = this.computeSelectorInstability(runtimeResult);
    const replayFragility = this.computeReplayFragility(runtimeResult);
    const structuralMutationRisk = this.computeStructuralMutationRisk(patchProposal, hardeningResult);
    const asyncInstability = this.computeAsyncInstability(hardeningResult);
    const iframeModalInstability = this.computeIframeModalInstability(hardeningResult);

    const overallRiskLevel = this.computeOverallRisk(
      selectorInstability.riskLevel,
      replayFragility.riskLevel,
      structuralMutationRisk.riskLevel,
      asyncInstability.riskLevel,
      iframeModalInstability.riskLevel,
    );

    const renderedVisualization = this.renderVisualization({
      reviewId,
      selectorInstability,
      replayFragility,
      structuralMutationRisk,
      asyncInstability,
      iframeModalInstability,
      overallRiskLevel,
    });

    return {
      reviewId,
      selectorInstability,
      replayFragility,
      structuralMutationRisk,
      asyncInstability,
      iframeModalInstability,
      overallRiskLevel,
      renderedVisualization,
    };
  }

  private computeSelectorInstability(runtimeResult: RuntimeValidationResult): MutationRiskVisualization['selectorInstability'] {
    const factors: string[] = [];

    if (runtimeResult.falsePositiveIndicators.some((i) => i.type === 'multiple-matches')) {
      factors.push('Multiple element matches detected');
    }
    if (runtimeResult.falsePositiveIndicators.some((i) => i.type === 'hidden-element')) {
      factors.push('Hidden element match detected');
    }
    if (runtimeResult.falsePositiveIndicators.some((i) => i.type === 'detached-element')) {
      factors.push('Detached element match detected');
    }

    const riskLevel = factors.length === 0 ? 'low' : factors.length <= 1 ? 'medium' : 'high';

    return { riskLevel, factors };
  }

  private computeReplayFragility(runtimeResult: RuntimeValidationResult): MutationRiskVisualization['replayFragility'] {
    const divergenceCount = runtimeResult.replayDivergence.length;

    const factors: string[] = [];
    for (const div of runtimeResult.replayDivergence) {
      factors.push(`${div.type} at step ${div.stepIndex}`);
    }

    const riskLevel = divergenceCount === 0 ? 'low' : divergenceCount <= 1 ? 'medium' : 'high';

    return { riskLevel, divergenceCount, factors };
  }

  private computeStructuralMutationRisk(
    patchProposal: PatchProposal,
    hardeningResult: RuntimeHardeningResult,
  ): MutationRiskVisualization['structuralMutationRisk'] {
    const factors: string[] = [];

    const diff = patchProposal.patchDiff;
    if (diff.addedLines + diff.removedLines > 2) {
      factors.push(`Large diff: ${diff.addedLines} added, ${diff.removedLines} removed`);
    }

    if (hardeningResult.domSettling.status !== 'stable') {
      factors.push(`DOM settling: ${hardeningResult.domSettling.status}`);
    }

    const riskLevel = factors.length === 0 ? 'low' : factors.length <= 1 ? 'medium' : 'high';

    return {
      riskLevel,
      astChangeType: patchProposal.astNodeMetadata.expressionType,
      factors,
    };
  }

  private computeAsyncInstability(hardeningResult: RuntimeHardeningResult): MutationRiskVisualization['asyncInstability'] {
    const factors: string[] = [];

    if (hardeningResult.asyncRender.reRenderChurnDetected) {
      factors.push('Async render re-render churn detected');
    }
    if (hardeningResult.asyncRender.incompleteRenders > 0) {
      factors.push(`${hardeningResult.asyncRender.incompleteRenders} incomplete async renders`);
    }

    const riskLevel = factors.length === 0 ? 'low' : factors.length <= 1 ? 'medium' : 'high';

    return { riskLevel, factors };
  }

  private computeIframeModalInstability(hardeningResult: RuntimeHardeningResult): MutationRiskVisualization['iframeModalInstability'] {
    const factors: string[] = [];

    if (hardeningResult.frameModal.nestedFrameCount > 0) {
      factors.push(`${hardeningResult.frameModal.nestedFrameCount} nested frames detected`);
    }
    if (hardeningResult.frameModal.modalTransitionCount > 0) {
      factors.push(`${hardeningResult.frameModal.modalTransitionCount} modal transitions detected`);
    }
    if (hardeningResult.frameModal.focusTrapViolations > 0) {
      factors.push(`${hardeningResult.frameModal.focusTrapViolations} focus trap violations`);
    }
    if (hardeningResult.frameModal.overlayInterceptions > 0) {
      factors.push(`${hardeningResult.frameModal.overlayInterceptions} overlay interceptions`);
    }

    const riskLevel = factors.length === 0 ? 'low' : factors.length <= 1 ? 'medium' : 'high';

    return { riskLevel, factors };
  }

  private computeOverallRisk(
    selector: 'low' | 'medium' | 'high',
    replay: 'low' | 'medium' | 'high',
    structural: 'low' | 'medium' | 'high',
    async: 'low' | 'medium' | 'high',
    iframe: 'low' | 'medium' | 'high',
  ): 'low' | 'medium' | 'high' | 'critical' {
    const riskScores: Record<string, number> = { low: 1, medium: 2, high: 3 };
    const total = (riskScores[selector] ?? 0) + (riskScores[replay] ?? 0) + (riskScores[structural] ?? 0) + (riskScores[async] ?? 0) + (riskScores[iframe] ?? 0);

    if (total >= 12) return 'critical';
    if (total >= 9) return 'high';
    if (total >= 6) return 'medium';
    return 'low';
  }

  private renderVisualization(report: Omit<MutationRiskVisualization, 'renderedVisualization'>): string {
    const lines: string[] = [];

    lines.push('=== Mutation Risk Visualization ===');
    lines.push('');
    lines.push(`Overall risk: ${report.overallRiskLevel.toUpperCase()}`);
    lines.push('');

    lines.push('Selector Instability:');
    lines.push(`  Risk: ${report.selectorInstability.riskLevel}`);
    for (const factor of report.selectorInstability.factors) {
      lines.push(`    - ${factor}`);
    }
    lines.push('');

    lines.push('Replay Fragility:');
    lines.push(`  Risk: ${report.replayFragility.riskLevel}`);
    lines.push(`  Divergences: ${report.replayFragility.divergenceCount}`);
    for (const factor of report.replayFragility.factors) {
      lines.push(`    - ${factor}`);
    }
    lines.push('');

    lines.push('Structural Mutation Risk:');
    lines.push(`  Risk: ${report.structuralMutationRisk.riskLevel}`);
    lines.push(`  AST type: ${report.structuralMutationRisk.astChangeType}`);
    for (const factor of report.structuralMutationRisk.factors) {
      lines.push(`    - ${factor}`);
    }
    lines.push('');

    lines.push('Async Instability:');
    lines.push(`  Risk: ${report.asyncInstability.riskLevel}`);
    for (const factor of report.asyncInstability.factors) {
      lines.push(`    - ${factor}`);
    }
    lines.push('');

    lines.push('iframe/Modal Instability:');
    lines.push(`  Risk: ${report.iframeModalInstability.riskLevel}`);
    for (const factor of report.iframeModalInstability.factors) {
      lines.push(`    - ${factor}`);
    }

    return lines.join('\n');
  }
}
