/**
 * Confidence Breakdown Renderer
 *
 * Renders confidence composition, structural/runtime/replay weighting,
 * and governance adjustments for developer review.
 *
 * Reuses: HealingExplanation, ValidationResult, RuntimeValidationResult, GovernanceResult
 */

import type { ConfidenceBreakdownReport } from './types.js';
import type { ConfidenceBreakdown } from '../../models/healing-explanation.js';
import type { ValidationResult } from '../../models/validation.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';
import type { GovernanceResult } from '../pipeline/confidence-governance.js';

export class ConfidenceBreakdownRenderer {
  render(
    confidenceBreakdown: ConfidenceBreakdown,
    validationResult: ValidationResult,
    runtimeResult: RuntimeValidationResult,
    governanceResult: GovernanceResult,
  ): ConfidenceBreakdownReport {
    const reviewId = `confidence-${validationResult.id}`;

    const gatesPassed = governanceResult.gates.filter((g) => g.passed).length;
    const gatesFailed = governanceResult.gates.filter((g) => !g.passed).length;

    const adjustments: string[] = [];
    for (const gate of governanceResult.gates) {
      if (!gate.passed) {
        adjustments.push(`Gate '${gate.gate}' failed: ${gate.detail}`);
      }
    }

    const renderedBreakdown = this.renderBreakdown({
      reviewId,
      confidenceComposition: confidenceBreakdown,
      structuralWeighting: {
        survivabilityScore: confidenceBreakdown.survivabilityScore,
        structuralSimilarity: confidenceBreakdown.structuralSimilarity,
        attributeMatchScore: confidenceBreakdown.attributeMatchScore,
        hierarchyStability: confidenceBreakdown.hierarchyStability,
      },
      runtimeWeighting: {
        runtimeConfidence: runtimeResult.runtimeConfidence,
        executedStepCount: runtimeResult.executedStepCount,
      },
      replayWeighting: {
        replayConfidence: validationResult.replayConfidence,
        matchedElementCount: validationResult.matchedElementCount,
        interactionSuccess: validationResult.interactionSuccess,
      },
      governanceAdjustments: {
        gatesPassed,
        gatesFailed,
        adjustments,
      },
    });

    return {
      reviewId,
      confidenceComposition: confidenceBreakdown,
      structuralWeighting: {
        survivabilityScore: confidenceBreakdown.survivabilityScore,
        structuralSimilarity: confidenceBreakdown.structuralSimilarity,
        attributeMatchScore: confidenceBreakdown.attributeMatchScore,
        hierarchyStability: confidenceBreakdown.hierarchyStability,
      },
      runtimeWeighting: {
        runtimeConfidence: runtimeResult.runtimeConfidence,
        executedStepCount: runtimeResult.executedStepCount,
      },
      replayWeighting: {
        replayConfidence: validationResult.replayConfidence,
        matchedElementCount: validationResult.matchedElementCount,
        interactionSuccess: validationResult.interactionSuccess,
      },
      governanceAdjustments: {
        gatesPassed,
        gatesFailed,
        adjustments,
      },
      renderedBreakdown,
    };
  }

  private renderBreakdown(report: Omit<ConfidenceBreakdownReport, 'renderedBreakdown'>): string {
    const lines: string[] = [];

    lines.push('=== Confidence Breakdown ===');
    lines.push('');
    lines.push(`Overall confidence: ${(report.confidenceComposition.overall * 100).toFixed(1)}%`);
    lines.push('');
    lines.push('Structural Weighting:');
    lines.push(`  Survivability:    ${(report.structuralWeighting.survivabilityScore * 100).toFixed(1)}%`);
    lines.push(`  Structural:       ${(report.structuralWeighting.structuralSimilarity * 100).toFixed(1)}%`);
    lines.push(`  Attribute match:  ${(report.structuralWeighting.attributeMatchScore * 100).toFixed(1)}%`);
    lines.push(`  Hierarchy:        ${(report.structuralWeighting.hierarchyStability * 100).toFixed(1)}%`);
    lines.push('');
    lines.push('Runtime Weighting:');
    lines.push(`  Confidence:       ${(report.runtimeWeighting.runtimeConfidence * 100).toFixed(1)}%`);
    lines.push(`  Steps executed:   ${report.runtimeWeighting.executedStepCount}`);
    lines.push('');
    lines.push('Replay Weighting:');
    lines.push(`  Confidence:       ${(report.replayWeighting.replayConfidence * 100).toFixed(1)}%`);
    lines.push(`  Matches:          ${report.replayWeighting.matchedElementCount}`);
    lines.push(`  Interaction:      ${report.replayWeighting.interactionSuccess ? 'success' : 'failed'}`);
    lines.push('');
    lines.push('Governance Adjustments:');
    lines.push(`  Gates passed:     ${report.governanceAdjustments.gatesPassed}`);
    lines.push(`  Gates failed:     ${report.governanceAdjustments.gatesFailed}`);
    if (report.governanceAdjustments.adjustments.length > 0) {
      lines.push('  Adjustments:');
      for (const adj of report.governanceAdjustments.adjustments) {
        lines.push(`    - ${adj}`);
      }
    }

    return lines.join('\n');
  }
}
