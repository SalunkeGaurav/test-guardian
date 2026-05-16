/**
 * Review Bundle Generator
 *
 * Generates unified developer-facing review package with all reports,
 * patch diff, governance explanation, replay evidence, rollback guidance,
 * and runtime metrics. Persists to .testguardian/developer-review/.
 *
 * Reuses:
 * - ReviewRenderer
 * - PatchVisualizer
 * - GovernanceExplainer
 * - ReplayEvidenceRenderer
 * - ConfidenceBreakdownRenderer
 * - RollbackReview
 * - MutationRiskVisualizer
 * - ExplainabilityEngine
 * - RuntimeStabilityEngine
 * - ConfidenceGovernance
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReviewBundle } from './types.js';
import type { RuntimeHealingReviewPackage } from '../runtime-healing-loop/types.js';
import type { RuntimeHardeningResult } from '../runtime-hardening/types.js';
import type { PatchProposal } from '../../models/patch.js';
import type { ValidationResult } from '../../models/validation.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';
import type { GovernanceResult, GovernanceConfig } from '../pipeline/confidence-governance.js';
import { ReviewRenderer } from './review-renderer.js';
import { PatchVisualizer } from './patch-visualizer.js';
import { GovernanceExplainer } from './governance-explainer.js';
import { ReplayEvidenceRenderer } from './replay-evidence-renderer.js';
import { ConfidenceBreakdownRenderer } from './confidence-breakdown-renderer.js';
import { RollbackReview } from './rollback-review.js';
import { MutationRiskVisualizer } from './mutation-risk-visualizer.js';

let bundleCounter = 0;
function nextBundleId(): string {
  bundleCounter++;
  return `bundle-${bundleCounter}`;
}

export class ReviewBundleGenerator {
  private readonly reviewRenderer: ReviewRenderer;
  private readonly patchVisualizer: PatchVisualizer;
  private readonly governanceExplainer: GovernanceExplainer;
  private readonly replayEvidenceRenderer: ReplayEvidenceRenderer;
  private readonly confidenceBreakdownRenderer: ConfidenceBreakdownRenderer;
  private readonly rollbackReview: RollbackReview;
  private readonly mutationRiskVisualizer: MutationRiskVisualizer;

  constructor(private readonly projectRoot: string) {
    this.reviewRenderer = new ReviewRenderer();
    this.patchVisualizer = new PatchVisualizer();
    this.governanceExplainer = new GovernanceExplainer();
    this.replayEvidenceRenderer = new ReplayEvidenceRenderer();
    this.confidenceBreakdownRenderer = new ConfidenceBreakdownRenderer();
    this.rollbackReview = new RollbackReview();
    this.mutationRiskVisualizer = new MutationRiskVisualizer();
  }

  generate(
    reviewPackage: RuntimeHealingReviewPackage,
    hardeningResult: RuntimeHardeningResult,
    patchProposal: PatchProposal,
    validationResult: ValidationResult,
    runtimeResult: RuntimeValidationResult,
    governanceResult: GovernanceResult,
    governanceConfig: GovernanceConfig,
  ): ReviewBundle {
    const bundleId = nextBundleId();

    const reviewReport = this.reviewRenderer.render(
      reviewPackage.originalLocator,
      reviewPackage.healedLocator,
      reviewPackage.explainabilitySummary.strategy,
      validationResult,
      runtimeResult,
      hardeningResult,
      governanceResult,
      reviewPackage.rollbackMetadata,
      reviewPackage.explainabilitySummary,
    );

    const patchVisualization = this.patchVisualizer.visualize(patchProposal);

    const governanceExplanation = this.governanceExplainer.explain(
      governanceResult,
      runtimeResult,
      hardeningResult,
      {
        minStaticValidationConfidence: governanceConfig.minStaticValidationConfidence,
        minRuntimeConfidence: governanceConfig.minRuntimeConfidence,
        requireUniqueness: governanceConfig.requireUniqueness,
        requireReplayConsistency: governanceConfig.requireReplayConsistency,
      },
    );

    const replayEvidence = this.replayEvidenceRenderer.render(runtimeResult);

    const confidenceBreakdown = this.confidenceBreakdownRenderer.render(
      reviewPackage.confidenceBreakdown,
      validationResult,
      runtimeResult,
      governanceResult,
    );

    const rollbackReviewReport = this.rollbackReview.review(
      reviewPackage.rollbackMetadata,
      patchProposal,
      validationResult,
    );

    const mutationRiskVisualization = this.mutationRiskVisualizer.visualize(
      hardeningResult,
      runtimeResult,
      patchProposal,
    );

    const bundle: ReviewBundle = {
      bundleId,
      reviewReport,
      patchVisualization,
      governanceExplanation,
      replayEvidence,
      confidenceBreakdown,
      rollbackReview: rollbackReviewReport,
      mutationRiskVisualization,
      runtimeMetrics: {
        domStabilizationSuccessRate: hardeningResult.metrics.domStabilizationSuccessRate,
        replayRecoverySuccess: hardeningResult.metrics.replayRecoverySuccess,
        staleRecoverySuccess: hardeningResult.metrics.staleRecoverySuccess,
        iframeRecoveryRate: hardeningResult.metrics.iframeRecoveryRate,
      },
      persistedPaths: [],
      generatedAt: 0,
    };

    bundle.persistedPaths = this.persistBundle(bundle);

    return bundle;
  }

  private persistBundle(bundle: ReviewBundle): string[] {
    const paths: string[] = [];

    try {
      const outputDir = join(this.projectRoot, '.testguardian', 'developer-review');
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const bundlePath = join(outputDir, `${bundle.bundleId}.json`);
      writeFileSync(
        bundlePath,
        JSON.stringify(
          {
            bundleId: bundle.bundleId,
            reviewReport: {
              reviewId: bundle.reviewReport.reviewId,
              locatorSummary: bundle.reviewReport.locatorSummary,
              validationOutcome: bundle.reviewReport.validationOutcome,
              replayOutcome: bundle.reviewReport.replayOutcome,
              runtimeStabilityOutcome: bundle.reviewReport.runtimeStabilityOutcome,
              governanceReasoning: bundle.reviewReport.governanceReasoning,
              rollbackInstructions: bundle.reviewReport.rollbackInstructions,
            },
            patchVisualization: {
              patchId: bundle.patchVisualization.patchId,
              targetFile: bundle.patchVisualization.targetFile,
              patchScope: bundle.patchVisualization.patchScope,
              structuralImpact: bundle.patchVisualization.structuralImpact,
            },
            governanceExplanation: {
              reviewId: bundle.governanceExplanation.reviewId,
              overallDecision: bundle.governanceExplanation.overallDecision,
              approvalReasons: bundle.governanceExplanation.approvalReasons.length,
              rejectionReasons: bundle.governanceExplanation.rejectionReasons.length,
            },
            replayEvidence: {
              reviewId: bundle.replayEvidence.reviewId,
              totalSteps: bundle.replayEvidence.replayPathSummary.totalSteps,
              divergenceCount: bundle.replayEvidence.divergenceEvidence.length,
              warnings: bundle.replayEvidence.unstableExecutionWarnings.length,
            },
            confidenceBreakdown: {
              reviewId: bundle.confidenceBreakdown.reviewId,
              overallConfidence: bundle.confidenceBreakdown.confidenceComposition.overall,
            },
            rollbackReview: {
              reviewId: bundle.rollbackReview.reviewId,
              available: bundle.rollbackReview.rollbackAvailability,
              riskLevel: bundle.rollbackReview.patchReversibility.riskLevel,
            },
            mutationRiskVisualization: {
              reviewId: bundle.mutationRiskVisualization.reviewId,
              overallRiskLevel: bundle.mutationRiskVisualization.overallRiskLevel,
            },
            runtimeMetrics: bundle.runtimeMetrics,
          },
          null,
          2,
        ),
        'utf-8',
      );
      paths.push(bundlePath);

      const textPath = join(outputDir, `${bundle.bundleId}-report.txt`);
      const textContent = [
        this.reviewRenderer.renderText(bundle.reviewReport),
        '',
        '=== Patch Visualization ===',
        bundle.patchVisualization.renderedSummary,
        '',
        '=== Governance Explanation ===',
        bundle.governanceExplanation.renderedExplanation,
        '',
        '=== Replay Evidence ===',
        bundle.replayEvidence.renderedEvidence,
        '',
        '=== Confidence Breakdown ===',
        bundle.confidenceBreakdown.renderedBreakdown,
        '',
        '=== Rollback Review ===',
        bundle.rollbackReview.renderedRollback,
        '',
        '=== Mutation Risk ===',
        bundle.mutationRiskVisualization.renderedVisualization,
      ].join('\n');
      writeFileSync(textPath, textContent, 'utf-8');
      paths.push(textPath);
    } catch {
    }

    return paths;
  }
}
