/**
 * RuntimeHealingLoop
 *
 * Orchestrates the first true end-to-end runtime healing execution loop.
 *
 * Flow:
 *   1. Capture runtime Playwright failure
 *   2. Generate healing candidates via existing HealingPipeline
 *   3. Execute candidates through validation + governance, reject failing ones
 *   4. Generate deterministic patch proposal via existing PatchGenerator
 *   5. Apply patch INSIDE sandbox only via existing MutationSandbox
 *   6. Re-run affected tests in sandbox
 *   7. Verify: compile, replay, no divergence, no new failures
 *   8. Generate RuntimeHealingReviewPackage for developer review
 *   9. Persist reports to .testguardian/runtime-healing/
 *
 * STOPS before modifying the real repository.
 *
 * Reuses: HealingPipeline, ValidationEngine, PatchGenerator, MutationSandbox,
 *         ConfidenceGovernance, ExplainabilityEngine, AuditPersister
 *
 * No AI. No autonomous modification. Deterministic flow.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Result } from '../../models/result.js';
import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { PatchProposal } from '../../models/patch.js';
import type { PipelineResult } from '../../models/pipeline.js';
import type { RuntimeHealingLoopInput, RuntimeHealingLoopResult, RuntimeHealingMetrics, FailureContext, SandboxPatchResult } from './types.js';
import { success, failure } from '../../models/result.js';
import { HealingPipeline } from '../pipeline/healing-pipeline.js';
import type { GovernanceConfig } from '../pipeline/confidence-governance.js';
import { PatchGenerator } from '../patcher/patch-generator.js';
import type { PatchGeneratorInput } from '../patcher/patch-generator.js';
import { CandidateExecutor } from './candidate-executor.js';
import { SandboxRevalidator } from './sandbox-revalidator.js';
import { ReviewPackageGenerator } from './review-package-generator.js';
import { AuditPersister } from '../pipeline/audit-persister.js';

const RUNTIME_HEALING_STORAGE_DIR = 'runtime-healing';

export class RuntimeHealingLoop {
  private readonly pipeline: HealingPipeline;
  private readonly patchGenerator: PatchGenerator;
  private readonly auditPersister: AuditPersister;

  constructor(
    private readonly projectRoot: string,
    governanceConfig?: Partial<GovernanceConfig>,
  ) {
    this.pipeline = new HealingPipeline(undefined, governanceConfig, projectRoot);
    this.patchGenerator = new PatchGenerator();
    this.auditPersister = new AuditPersister(projectRoot);
  }

  /**
   * Execute the full runtime healing loop for a single failure.
   */
  async execute(input: RuntimeHealingLoopInput): Promise<Result<RuntimeHealingLoopResult>> {
    try {
      const { failureContext, projectRoot } = input;

      // Step 1: Failure is already captured in input.failureContext
      const context = failureContext;

      // Step 2: Generate healing candidates using existing HealingPipeline
      const pipelineResult = await this.pipeline.run({
        locator: context.locator,
        originalDom: context.domSnapshot,
        currentDom: context.domSnapshot,
        replaySession: context.replaySession,
        stepIndex: 0,
      });

      if (!pipelineResult.ok) {
        return failure(`Healing pipeline failed: ${pipelineResult.error}`);
      }

      const candidates = pipelineResult.value.candidates;
      if (candidates.length === 0) {
        return failure('No healing candidates generated');
      }

      // Step 3: Execute candidates, apply rejection criteria
      const executor = new CandidateExecutor(input.governanceThreshold ? { minStaticValidationConfidence: input.governanceThreshold } : undefined);
      const execResults = executor.execute({
        failureContext: context,
        candidates,
        currentDom: context.domSnapshot,
      });

      if (!execResults.ok) {
        return failure(`Candidate execution failed: ${execResults.error}`);
      }

      const safestResult = executor.selectSafestCandidate(execResults.value);
      if (!safestResult.ok) {
        return failure(`No approved candidates: ${safestResult.error}`);
      }

      const selected = safestResult.value;

      // Step 4: Generate deterministic patch proposal
      const patchInput: PatchGeneratorInput = {
        candidate: selected.candidate,
        targetFile: context.failingFile,
        targetLine: context.failingLine,
        validation: selected.validation,
        runtimeValidation: selected.runtimeValidation,
        auditTrailId: pipelineResult.value.auditTrailId,
        governanceThreshold: input.governanceThreshold,
      };

      const patchResult = this.patchGenerator.generate(patchInput);
      if (!patchResult.ok) {
        return failure(`Patch generation failed: ${patchResult.error}`);
      }

      const patchProposal = patchResult.value;

      // Step 5-6: Apply patch in sandbox and re-run tests
      const revalidator = new SandboxRevalidator(projectRoot);
      const sandboxResult = await revalidator.revalidate({
        patchProposal,
        failureContext: context,
        projectRoot,
      });

      if (!sandboxResult.ok) {
        return failure(`Sandbox revalidation failed: ${sandboxResult.error}`);
      }

      // Step 7: Verify acceptance criteria
      const acceptance = SandboxRevalidator.verifyAcceptance(sandboxResult.value);
      if (!acceptance.allPassed) {
        const reasons: string[] = [];
        if (!acceptance.compileSuccess) reasons.push('Compilation failed');
        if (!acceptance.replaySuccess) reasons.push('Replay failed');
        if (!acceptance.noNavigationDivergence) reasons.push('Navigation divergence detected');
        if (!acceptance.noNewFailures) reasons.push('New failures introduced');
        return failure(`Sandbox verification failed: ${reasons.join('; ')}`);
      }

      // Step 8: Generate review package
      const reviewGenerator = new ReviewPackageGenerator();
      const reviewInput = {
        failureContext: context,
        selectedCandidate: {
          originalExpression: selected.candidate.originalExpression,
          proposedExpression: selected.candidate.proposedExpression,
        },
        confidenceBreakdown: selected.candidate.ranking,
        validationResults: execResults.value.filter(r => !r.rejected).map(r => r.validation),
        runtimeValidation: selected.runtimeValidation,
        replayDivergences: [],
        sandboxResult: sandboxResult.value,
        governanceResult: this.buildGovernanceResultFromExec(execResults.value),
        gateResults: execResults.value.flatMap(r => r.governanceResult ?? []),
        patchProposal,
      };

      const reviewResult = reviewGenerator.generate(reviewInput);
      if (!reviewResult.ok) {
        return failure(`Review package generation failed: ${reviewResult.error}`);
      }

      const reviewPackage = reviewResult.value;

      // Step 9: Persist reports
      const persistedPaths = await this.persistResults(reviewPackage, sandboxResult.value, pipelineResult.value);

      // Build metrics
      const metrics = this.buildMetrics(acceptance, sandboxResult.value);

      return success({
        reviewPackage,
        metrics,
        persistedPaths,
      });
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  private buildGovernanceResultFromExec(execResults: import('./types.js').CandidateExecutionResult[]): import('../pipeline/confidence-governance.js').GovernanceResult {
    const approved: HealingCandidate[] = [];
    const rejected: Array<{ candidate: HealingCandidate; reason: string; gate: string }> = [];

    for (const r of execResults) {
      if (r.rejected) {
        rejected.push({
          candidate: r.candidate,
          reason: r.rejectionReasons.join('; ') || 'Rejected by execution criteria',
          gate: 'runtime-healing-loop',
        });
      }
    }

    return {
      passed: approved.length > 0,
      gates: [],
      approvedCandidates: approved,
      rejectedCandidates: rejected,
    };
  }

  private async persistResults(
    reviewPackage: import('./types.js').RuntimeHealingReviewPackage,
    sandboxResult: SandboxPatchResult,
    pipelineResult: PipelineResult,
  ): Promise<string[]> {
    const paths: string[] = [];

    try {
      const outputDir = join(this.projectRoot, '.testguardian', RUNTIME_HEALING_STORAGE_DIR);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const reviewPath = join(outputDir, `${reviewPackage.reviewId}.json`);
      writeFileSync(reviewPath, JSON.stringify(reviewPackage, null, 2), 'utf-8');
      paths.push(reviewPath);

      const sandboxPath = join(outputDir, `${reviewPackage.reviewId}-sandbox.json`);
      writeFileSync(sandboxPath, JSON.stringify({
        sandboxId: sandboxResult.sandboxId,
        compileResult: sandboxResult.compileResult,
        replayResult: sandboxResult.replayResult,
        runtimeResult: sandboxResult.runtimeResult,
        isolationVerified: sandboxResult.isolationVerified,
      }, null, 2), 'utf-8');
      paths.push(sandboxPath);

      const metricsPath = join(outputDir, `${reviewPackage.reviewId}-metrics.json`);
      writeFileSync(metricsPath, JSON.stringify({
        reviewId: reviewPackage.reviewId,
        status: reviewPackage.status,
        originalLocator: reviewPackage.originalLocator,
        healedLocator: reviewPackage.healedLocator,
        confidenceBreakdown: reviewPackage.confidenceBreakdown,
        sandboxVerification: reviewPackage.sandboxVerification,
        createdAt: reviewPackage.createdAt,
      }, null, 2), 'utf-8');
      paths.push(metricsPath);
    } catch {
    }

    return paths;
  }

  private buildMetrics(
    acceptance: { compileSuccess: boolean; replaySuccess: boolean; noNavigationDivergence: boolean; noNewFailures: boolean; allPassed: boolean },
    sandboxResult: SandboxPatchResult,
  ): RuntimeHealingMetrics {
    return {
      totalHealingAttempts: 1,
      successfulHealings: acceptance.allPassed ? 1 : 0,
      sandboxReplaySuccesses: sandboxResult.replayResult.success ? 1 : 0,
      falseRecoveries: 0,
      replayDivergences: sandboxResult.replayResult.divergedSteps,
      rollbackReliability: sandboxResult.isolationVerified ? 1 : 0,
      patchSurvivability: acceptance.compileSuccess ? 1 : 0,
    };
  }
}
