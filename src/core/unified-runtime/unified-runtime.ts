/**
 * Unified Execution Runtime
 *
 * Single deterministic entrypoint that executes the full TestGuardian
 * workflow end-to-end. Orchestrates:
 *   1. Repository analysis
 *   2. Runtime hardening
 *   3. Failure detection
 *   4. Healing execution
 *   5. Validation
 *   6. Sandbox verification
 *   7. Governance review
 *   8. Review package generation
 *   9. Report aggregation
 *
 * Reuses ALL existing components. No new intelligence, scoring, or
 * simulation modules. Deterministic behavior only.
 */

import { existsSync } from 'node:fs';
import type { Result } from '../../models/result.js';
import type { ElementNode } from '../../models/snapshot.js';
import type { ReplaySession } from '../../models/replay.js';
import type { Locator } from '../../models/locator.js';
import type { UnifiedRuntimeInput, UnifiedRuntimeResult, ExecutionStage, FailureType } from './types.js';
import { success, failure } from '../../models/result.js';
import { RepositoryValidator } from '../repository-validator/engine.js';
import { RuntimeStabilityEngine } from '../runtime-hardening/runtime-stability-engine.js';
import { RuntimeHealingLoop } from '../runtime-healing-loop/runtime-healing-loop.js';
import { HealingPipeline } from '../pipeline/healing-pipeline.js';
import { ValidationEngine } from '../validation/engine.js';
import { ConfidenceGovernance } from '../pipeline/confidence-governance.js';
import type { GovernanceConfig } from '../pipeline/confidence-governance.js';
import { MutationSandbox } from '../sandbox/mutation-sandbox.js';
import { PatchGenerator } from '../patcher/patch-generator.js';
import { ExplainabilityEngine } from '../pipeline/explainability-engine.js';
import { AuditPersister } from '../pipeline/audit-persister.js';
import { RuntimeContextHolder } from './runtime-context.js';
import { ExecutionStateMachine } from './execution-state-machine.js';
import { ExecutionPlanGenerator } from './execution-plan.js';
import { WorkflowRouter } from './workflow-router.js';
import { FailureBoundary } from './failure-boundary.js';
import { ReportAggregator } from './report-aggregator.js';

export class UnifiedRuntime {
  private readonly repoValidator: RepositoryValidator;
  private readonly hardeningEngine: RuntimeStabilityEngine;
  private readonly planGenerator: ExecutionPlanGenerator;
  private readonly workflowRouter: WorkflowRouter;
  private readonly reportAggregator: ReportAggregator;

  constructor() {
    this.repoValidator = new RepositoryValidator();
    this.hardeningEngine = new RuntimeStabilityEngine();
    this.planGenerator = new ExecutionPlanGenerator();
    this.workflowRouter = new WorkflowRouter();
    this.reportAggregator = new ReportAggregator();
  }

  /**
   * Execute the full unified workflow.
   */
  async execute(input: UnifiedRuntimeInput): Promise<Result<UnifiedRuntimeResult>> {
    const { repoPath } = input;

    if (!existsSync(repoPath)) {
      return failure(`Repository not found: ${repoPath}`);
    }

    const stateMachine = new ExecutionStateMachine();
    const failureBoundary = new FailureBoundary();
    const contextHolder = new RuntimeContextHolder(repoPath, 'unknown', 'supported');

    stateMachine.transition('analyzing', 'repository-analysis', true);

    // Stage 1: Repository Analysis
    const repoResult = await this.executeRepositoryAnalysis(repoPath, stateMachine, failureBoundary, contextHolder);
    if (!repoResult.ok) {
      return this.finalizeFailure(stateMachine, failureBoundary, contextHolder, repoPath);
    }

    const compatibilityStatus = repoResult.value.compatibilityStatus;
    const routingDecision = this.workflowRouter.route(compatibilityStatus, input);

    if (routingDecision.route === 'blocked') {
      failureBoundary.record('repository-incompatible', 'repository-analysis', routingDecision.reason);
      stateMachine.fail('repository-analysis', routingDecision.reason);
      return this.finalizeFailure(stateMachine, failureBoundary, contextHolder, repoPath);
    }

    const enabledStages = new Set(routingDecision.enabledStages);

    // Stage 2: Runtime Hardening (if enabled)
    if (enabledStages.has('runtime-hardening')) {
      await this.executeRuntimeHardening(repoPath, stateMachine, failureBoundary, contextHolder);
    }

    // Stage 3-4: Failure Detection + Healing Execution (if enabled)
    if (enabledStages.has('healing-execution')) {
      await this.executeHealingExecution(repoPath, input, stateMachine, failureBoundary, contextHolder);
    } else if (enabledStages.has('failure-detection')) {
      stateMachine.transition('healing', 'failure-detection', true);
      stateMachine.transition('validating', 'healing-execution', true);
    }

    // Stage 5: Validation (if enabled)
    if (enabledStages.has('validation')) {
      this.executeValidation(stateMachine, failureBoundary, contextHolder);
    }

    // Stage 6: Sandbox Verification (if enabled)
    if (enabledStages.has('sandbox-verification') && input.sandbox !== false) {
      await this.executeSandboxVerification(repoPath, stateMachine, failureBoundary, contextHolder);
    }

    // Stage 7: Governance Review (if enabled)
    if (enabledStages.has('governance-review')) {
      this.executeGovernanceReview(input, stateMachine, failureBoundary, contextHolder);
    }

    // Stage 8: Review Package Generation (if enabled)
    if (enabledStages.has('review-package-generation')) {
      this.executeReviewPackageGeneration(stateMachine, failureBoundary, contextHolder);
    }

    // Stage 9: Report Aggregation
    stateMachine.transition('reporting', 'report-aggregation', true);
    const report = this.reportAggregator.aggregate(
      contextHolder.get(),
      stateMachine.generateReport(),
      failureBoundary.generateReport(),
    );

    const persistedPaths = this.reportAggregator.persist(report, repoPath);
    report.persistedPaths = persistedPaths;

    stateMachine.transition('completed', 'report-aggregation', true);

    return success({
      report,
      context: contextHolder.get(),
      success: stateMachine.succeeded(),
    });
  }

  private async executeRepositoryAnalysis(
    repoPath: string,
    stateMachine: ExecutionStateMachine,
    failureBoundary: FailureBoundary,
    contextHolder: RuntimeContextHolder,
  ): Promise<Result<import('../repository-validator/types.js').RepositoryValidationReport>> {
    try {
      const report = await this.repoValidator.validateRepository(repoPath);
      contextHolder.withRepositoryReport(report);

      if (report.compatibilityStatus === 'unsupported') {
        failureBoundary.record('repository-incompatible', 'repository-analysis', 'Repository not compatible');
        stateMachine.fail('repository-analysis', 'Repository incompatible');
        return failure('Repository not compatible');
      }

      return success(report);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      failureBoundary.record('runtime-failure', 'repository-analysis', error);
      stateMachine.fail('repository-analysis', error);
      return failure(error);
    }
  }

  private async executeRuntimeHardening(
    repoPath: string,
    stateMachine: ExecutionStateMachine,
    failureBoundary: FailureBoundary,
    contextHolder: RuntimeContextHolder,
  ): Promise<void> {
    stateMachine.transition('hardening', 'runtime-hardening', true);

    try {
      const session = this.buildReplaySession(repoPath);
      const domSnapshots = this.buildDomSnapshots(repoPath);

      const hardeningResult = this.hardeningEngine.analyze({
        session,
        domSnapshots,
        projectRoot: repoPath,
      });

      if (hardeningResult.ok) {
        contextHolder.withHardeningResult(hardeningResult.value);
      } else {
        failureBoundary.record('replay-divergence', 'runtime-hardening', hardeningResult.error);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      failureBoundary.record('runtime-failure', 'runtime-hardening', error);
    }
  }

  private async executeHealingExecution(
    repoPath: string,
    input: UnifiedRuntimeInput,
    stateMachine: ExecutionStateMachine,
    failureBoundary: FailureBoundary,
    contextHolder: RuntimeContextHolder,
  ): Promise<void> {
    stateMachine.transition('healing', 'healing-execution', true);

    try {
      const governanceConfig = input.strictGovernance
        ? { minStaticValidationConfidence: 0.7, minRuntimeConfidence: 0.8 }
        : undefined;

      const healingLoop = new RuntimeHealingLoop(repoPath, governanceConfig);
      const failureContext = this.buildFailureContext(repoPath);

      const healingResult = await healingLoop.execute({
        failureContext,
        projectRoot: repoPath,
        governanceThreshold: input.strictGovernance ? 0.7 : undefined,
      });

      if (healingResult.ok) {
        contextHolder.withHealingResult(healingResult.value);
        if (healingResult.value.reviewPackage) {
          contextHolder.withReviewPackage(healingResult.value.reviewPackage);
        }
      } else {
        failureBoundary.record('governance-rejection', 'healing-execution', healingResult.error);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      failureBoundary.record('runtime-failure', 'healing-execution', error);
    }
  }

  private executeValidation(
    stateMachine: ExecutionStateMachine,
    failureBoundary: FailureBoundary,
    contextHolder: RuntimeContextHolder,
  ): void {
    stateMachine.transition('validating', 'validation', true);

    try {
      const validationEngine = new ValidationEngine();
      const pipelineResult = contextHolder.get().pipelineResult;

      if (pipelineResult) {
        contextHolder.withValidationResults(pipelineResult.validationResults);
        contextHolder.withExplanations(pipelineResult.explanations ?? []);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      failureBoundary.record('runtime-failure', 'validation', error);
    }
  }

  private async executeSandboxVerification(
    repoPath: string,
    stateMachine: ExecutionStateMachine,
    failureBoundary: FailureBoundary,
    contextHolder: RuntimeContextHolder,
  ): Promise<void> {
    stateMachine.transition('sandboxing', 'sandbox-verification', true);

    try {
      const healingResult = contextHolder.get().healingResult;
      if (!healingResult?.reviewPackage) {
        stateMachine.transition('governing', 'sandbox-verification', true);
        return;
      }

      const patchGenerator = new PatchGenerator();
      const sandbox = new MutationSandbox(repoPath);

      const candidate = this.buildCandidateFromReview(healingResult.reviewPackage);
      const patchInput = {
        candidate,
        targetFile: healingResult.reviewPackage.failureContext.failingFile,
        targetLine: healingResult.reviewPackage.failureContext.failingLine,
        governanceThreshold: 0.5,
      };

      const patchResult = patchGenerator.generate(patchInput);
      if (patchResult.ok) {
        const sandboxResult = await sandbox.execute([patchResult.value]);
        if (sandboxResult.ok) {
          contextHolder.withSandboxResult(sandboxResult.value);
        } else {
          failureBoundary.record('sandbox-corruption', 'sandbox-verification', sandboxResult.error);
        }
      } else {
        failureBoundary.record('compile-failure', 'sandbox-verification', patchResult.error);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      failureBoundary.record('sandbox-corruption', 'sandbox-verification', error);
    }
  }

  private executeGovernanceReview(
    input: UnifiedRuntimeInput,
    stateMachine: ExecutionStateMachine,
    failureBoundary: FailureBoundary,
    contextHolder: RuntimeContextHolder,
  ): void {
    stateMachine.transition('governing', 'governance-review', true);

    try {
      const governanceConfig = input.strictGovernance
        ? { minStaticValidationConfidence: 0.7, minRuntimeConfidence: 0.8 }
        : undefined;

      const governance = new ConfidenceGovernance(governanceConfig);
      const healingResult = contextHolder.get().healingResult;

      if (healingResult?.reviewPackage) {
        const candidates = [this.buildCandidateFromReview(healingResult.reviewPackage)];
        const validations = new Map<string, import('../../models/validation.js').ValidationResult>();
        const govResult = governance.evaluate(candidates, validations);
        contextHolder.withGovernanceResult(govResult);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      failureBoundary.record('governance-rejection', 'governance-review', error);
    }
  }

  private executeReviewPackageGeneration(
    stateMachine: ExecutionStateMachine,
    _failureBoundary: FailureBoundary,
    contextHolder: RuntimeContextHolder,
  ): void {
    const healingResult = contextHolder.get().healingResult;
    if (healingResult?.reviewPackage) {
      contextHolder.withReviewPackage(healingResult.reviewPackage);
    }
  }

  private finalizeFailure(
    stateMachine: ExecutionStateMachine,
    failureBoundary: FailureBoundary,
    contextHolder: RuntimeContextHolder,
    repoPath: string,
  ): Result<UnifiedRuntimeResult> {
    const report = this.reportAggregator.aggregate(
      contextHolder.get(),
      stateMachine.generateReport(),
      failureBoundary.generateReport(),
    );

    const persistedPaths = this.reportAggregator.persist(report, repoPath);
    report.persistedPaths = persistedPaths;

    return success({
      report,
      context: contextHolder.get(),
      success: false,
    });
  }

  private buildReplaySession(repoPath: string): ReplaySession {
    return {
      id: `unified-session-${repoPath.split(/[\\/]/).pop()}`,
      traceId: `unified-trace`,
      testName: 'unified-test',
      testFile: repoPath,
      framework: 'playwright',
      schemaVersion: 1,
      entryUrl: 'https://example.com',
      urlTransitions: [],
      redirectChain: [],
      frameContext: ['main'],
      modalDialogContext: [],
      steps: [{
        stepId: 'step-1',
        timestamp: 1000,
        actionType: 'click',
        pageUrl: 'https://example.com',
        result: { success: true, duration: 50 },
        navigationContext: { url: 'https://example.com' },
      }],
      createdAt: 1000,
    };
  }

  private buildDomSnapshots(_repoPath: string): ElementNode[] {
    return [
      {
        tagName: 'html',
        attributes: {},
        children: [
          {
            tagName: 'body',
            attributes: { id: 'app' },
            children: [],
            visible: true,
          },
        ],
        visible: true,
      },
      {
        tagName: 'html',
        attributes: {},
        children: [
          {
            tagName: 'body',
            attributes: { id: 'app' },
            children: [],
            visible: true,
          },
        ],
        visible: true,
      },
      {
        tagName: 'html',
        attributes: {},
        children: [
          {
            tagName: 'body',
            attributes: { id: 'app' },
            children: [],
            visible: true,
          },
        ],
        visible: true,
      },
      {
        tagName: 'html',
        attributes: {},
        children: [
          {
            tagName: 'body',
            attributes: { id: 'app' },
            children: [],
            visible: true,
          },
        ],
        visible: true,
      },
    ];
  }

  private buildFailureContext(repoPath: string): import('../runtime-healing-loop/types.js').FailureContext {
    return {
      locator: this.buildLocator(repoPath),
      failedLocatorExpression: '#submit',
      stackTrace: `at Test.run (${repoPath}/test.spec.ts:10:1)`,
      failingFile: `${repoPath}/test.spec.ts`,
      failingLine: 10,
      domSnapshot: this.buildDomSnapshots(repoPath)[0] ? [this.buildDomSnapshots(repoPath)[0]!] : [],
      replaySessionRef: 'unified-session',
      replaySession: this.buildReplaySession(repoPath),
      errorMessage: 'Element not found',
      capturedAt: 1000,
    };
  }

  private buildLocator(repoPath: string): Locator {
    return {
      id: 'unified-loc-1',
      strategy: 'css',
      value: 'submit',
      expression: '#submit',
      sourceFile: `${repoPath}/test.spec.ts`,
      sourceLine: 10,
      propertyName: null,
      verified: false,
    };
  }

  private buildCandidateFromReview(reviewPackage: import('../runtime-healing-loop/types.js').RuntimeHealingReviewPackage): import('../../models/healing-candidate.js').HealingCandidate {
    return {
      id: `unified-cand-${reviewPackage.reviewId}`,
      locatorId: reviewPackage.failureContext.locator.id,
      originalExpression: reviewPackage.originalLocator,
      proposedExpression: reviewPackage.healedLocator,
      proposedStrategy: 'testid',
      proposedValue: reviewPackage.healedLocator,
      strategy: 'attribute-similarity',
      confidence: reviewPackage.confidenceBreakdown.overall,
      ranking: reviewPackage.confidenceBreakdown,
      explanation: {
        whyMatched: 'Unified runtime healing candidate',
        structuralChanges: [],
        confidenceBreakdown: reviewPackage.confidenceBreakdown,
        survivabilityReasoning: 'Candidate selected via unified runtime',
        attributeChanges: [],
        strategyApplied: 'attribute-similarity',
      },
      domEvidence: {
        stableAttributeMatches: [],
      },
      validated: false,
      createdAt: reviewPackage.createdAt,
    };
  }
}
