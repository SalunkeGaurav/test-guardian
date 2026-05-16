/**
 * Governance Explainer
 *
 * Renders approval/rejection reasons, confidence thresholds, replay concerns,
 * runtime instability concerns, and structural risks for developer review.
 *
 * Reuses: GovernanceResult, RuntimeHardeningResult, RuntimeValidationResult
 */

import type { GovernanceExplanationReport } from './types.js';
import type { GovernanceResult } from '../pipeline/confidence-governance.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';
import type { RuntimeHardeningResult } from '../runtime-hardening/types.js';

export class GovernanceExplainer {
  explain(
    governanceResult: GovernanceResult,
    runtimeResult: RuntimeValidationResult,
    hardeningResult: RuntimeHardeningResult,
    config: {
      minStaticValidationConfidence: number;
      minRuntimeConfidence: number;
      requireUniqueness: boolean;
      requireReplayConsistency: boolean;
    },
  ): GovernanceExplanationReport {
    const reviewId = `governance-${governanceResult.passed ? 'approved' : 'rejected'}`;

    const approvalReasons: string[] = [];
    const rejectionReasons: string[] = [];

    for (const gate of governanceResult.gates) {
      if (gate.passed) {
        approvalReasons.push(`${gate.gate}: ${gate.detail}`);
      } else {
        rejectionReasons.push(`${gate.gate}: ${gate.detail}`);
      }
    }

    for (const rejected of governanceResult.rejectedCandidates) {
      rejectionReasons.push(`Candidate ${rejected.candidate.id}: ${rejected.reason} (gate: ${rejected.gate})`);
    }

    const replayConcerns: string[] = [];
    if (runtimeResult.replayDivergence.length > 0) {
      for (const div of runtimeResult.replayDivergence) {
        replayConcerns.push(`Divergence at step ${div.stepIndex}: ${div.type} (expected: ${div.expected}, actual: ${div.actual})`);
      }
    }

    const runtimeInstabilityConcerns: string[] = [];
    if (hardeningResult.domSettling.status !== 'stable') {
      runtimeInstabilityConcerns.push(`DOM settling: ${hardeningResult.domSettling.status}`);
    }
    if (!hardeningResult.replayDrift.replayDeterministic) {
      runtimeInstabilityConcerns.push(`Replay drift: ${hardeningResult.replayDrift.driftSeverity}`);
    }
    if (hardeningResult.staleContext.failedRecoveries > 0) {
      runtimeInstabilityConcerns.push(`Stale context: ${hardeningResult.staleContext.failedRecoveries} failed recoveries`);
    }
    if (!hardeningResult.frameModal.stabilityPassed) {
      runtimeInstabilityConcerns.push(`Frame/modal stability: failed`);
    }

    const structuralRisks: string[] = [];
    if (hardeningResult.asyncRender.reRenderChurnDetected) {
      structuralRisks.push('Async render re-render churn detected');
    }
    if (hardeningResult.asyncRender.incompleteRenders > 0) {
      structuralRisks.push(`${hardeningResult.asyncRender.incompleteRenders} incomplete async renders`);
    }

    const gateExplanations = governanceResult.gates.map((gate) => ({
      gate: gate.gate,
      passed: gate.passed,
      detail: gate.detail,
      impact: gate.passed ? 'No blocking issue' : 'Blocks approval',
    }));

    const renderedExplanation = this.renderExplanation({
      reviewId,
      overallDecision: governanceResult.passed ? 'approved' : 'rejected',
      approvalReasons,
      rejectionReasons,
      confidenceThresholds: {
        minStaticValidationConfidence: config.minStaticValidationConfidence,
        minRuntimeConfidence: config.minRuntimeConfidence,
        requireUniqueness: config.requireUniqueness,
        requireReplayConsistency: config.requireReplayConsistency,
      },
      gateExplanations,
      replayConcerns,
      runtimeInstabilityConcerns,
      structuralRisks,
    });

    return {
      reviewId,
      overallDecision: governanceResult.passed ? 'approved' : 'rejected',
      approvalReasons,
      rejectionReasons,
      confidenceThresholds: config,
      gateExplanations,
      replayConcerns,
      runtimeInstabilityConcerns,
      structuralRisks,
      renderedExplanation,
    };
  }

  private renderExplanation(report: Omit<GovernanceExplanationReport, 'renderedExplanation'>): string {
    const lines: string[] = [];

    lines.push(`Decision: ${report.overallDecision.toUpperCase()}`);
    lines.push('');

    if (report.approvalReasons.length > 0) {
      lines.push('Approval reasons:');
      for (const reason of report.approvalReasons) {
        lines.push(`  [PASS] ${reason}`);
      }
      lines.push('');
    }

    if (report.rejectionReasons.length > 0) {
      lines.push('Rejection reasons:');
      for (const reason of report.rejectionReasons) {
        lines.push(`  [FAIL] ${reason}`);
      }
      lines.push('');
    }

    lines.push('Confidence thresholds:');
    lines.push(`  Static validation: >= ${(report.confidenceThresholds.minStaticValidationConfidence * 100).toFixed(0)}%`);
    lines.push(`  Runtime: >= ${(report.confidenceThresholds.minRuntimeConfidence * 100).toFixed(0)}%`);
    lines.push(`  Uniqueness: ${report.confidenceThresholds.requireUniqueness ? 'required' : 'not required'}`);
    lines.push(`  Replay consistency: ${report.confidenceThresholds.requireReplayConsistency ? 'required' : 'not required'}`);
    lines.push('');

    if (report.replayConcerns.length > 0) {
      lines.push('Replay concerns:');
      for (const concern of report.replayConcerns) {
        lines.push(`  - ${concern}`);
      }
      lines.push('');
    }

    if (report.runtimeInstabilityConcerns.length > 0) {
      lines.push('Runtime instability concerns:');
      for (const concern of report.runtimeInstabilityConcerns) {
        lines.push(`  - ${concern}`);
      }
      lines.push('');
    }

    if (report.structuralRisks.length > 0) {
      lines.push('Structural risks:');
      for (const risk of report.structuralRisks) {
        lines.push(`  - ${risk}`);
      }
    }

    return lines.join('\n');
  }
}
