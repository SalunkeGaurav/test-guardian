/**
 * Replay Coordinator
 *
 * Orchestrates deterministic replay of a ReplaySession against a browser.
 * Handles step-by-step execution, evidence collection, divergence detection,
 * and proposal injection for healing validation.
 *
 * No adaptive behavior. No retries. Strict step order.
 */

import type { Result } from '../../models/result.js';
import type { ReplaySession } from '../../models/replay.js';
import type { HealingCandidate } from '../../models/healing-candidate.js';
import type { RuntimeEvidence, ReplayDivergence, TimingMetadata, BrowserMetadata, RuntimeValidationResult, BrowserContextState } from '../../models/runtime.js';
import { success, failure } from '../../models/result.js';
import { StepExecutor } from './step-executor.js';
import { EvidenceCollector } from './evidence-collector.js';
import { DivergenceDetector } from './divergence.js';
import { RuntimeFalsePositiveDetector } from './false-positive.js';
import { SessionManager } from './session-manager.js';
import type { BrowserEngine } from './browser.js';
import { DEFAULT_BROWSER_TIMEOUT } from './schema.js';

export interface CoordinatorResult {
  evidence: RuntimeEvidence[];
  divergences: ReplayDivergence[];
  executedStepCount: number;
  totalStepCount: number;
  timing: TimingMetadata;
  failedStepId?: string;
}

let counter = 0;
function nextId(): string {
  counter++;
  return `runtime-${Date.now()}-${counter}`;
}

export class ReplayCoordinator {
  private readonly stepExecutor: StepExecutor;
  private readonly evidenceCollector: EvidenceCollector;
  private readonly divergenceDetector: DivergenceDetector;
  private readonly fpDetector: RuntimeFalsePositiveDetector;
  private readonly sessionManager: SessionManager;

  constructor(browser: BrowserEngine) {
    this.stepExecutor = new StepExecutor(browser);
    this.evidenceCollector = new EvidenceCollector(browser);
    this.divergenceDetector = new DivergenceDetector();
    this.fpDetector = new RuntimeFalsePositiveDetector();
    this.sessionManager = new SessionManager(browser);
  }

  /**
   * Execute a full, deterministic replay of a ReplaySession.
   *
   * If a proposal is provided, its locator is injected at proposalStepIndex
   * to validate whether the proposed expression resolves correctly.
   *
   * Returns the coordinator result with evidence, divergences, and timing.
   */
  async replay(
    session: ReplaySession,
    config?: { headless?: boolean; viewport?: { width: number; height: number } },
    proposal?: HealingCandidate,
    proposalStepIndex?: number,
  ): Promise<Result<CoordinatorResult>> {
    const evidence: RuntimeEvidence[] = [];
    const divergences: ReplayDivergence[] = [];
    const stepDurations: number[] = [];
    const startedAt = Date.now();

    // 1. Launch browser and create context
    const sessionResult = await this.sessionManager.startSession(config);
    if (!sessionResult.ok) return failure(sessionResult.error);

    const managedSession = sessionResult.value;
    let previousUrl = session.entryUrl;

    try {
      // 2. Navigate to entry URL
      const firstStep = session.steps[0];
      const needsEntryNav = firstStep?.actionType !== 'goto' || firstStep?.pageUrl !== session.entryUrl;

      if (needsEntryNav && session.entryUrl) {
        const entryResult = await this.stepExecutor.executeStep(
          {
            stepId: 'entry-nav',
            timestamp: Date.now(),
            actionType: 'goto',
            pageUrl: session.entryUrl,
            result: { success: true, duration: 0 },
            navigationContext: { url: session.entryUrl },
          },
          managedSession.browserContext,
        );

        if (entryResult.ok) {
          previousUrl = session.entryUrl;
        }
      }

      // 3. Execute steps in strict order
      let stepFailed = false;

      for (let i = 0; i < session.steps.length; i++) {
        const step = session.steps[i]!;
        const stepStartTime = performance.now();

        // Check if we need to inject proposal at this step
        const overrideLocator =
          proposal && proposalStepIndex === i
            ? { strategy: proposal.proposedStrategy, value: proposal.proposedValue }
            : undefined;

        // Execute step
        const execResult = await this.stepExecutor.executeStep(
          step,
          managedSession.browserContext,
          overrideLocator,
        );

        const stepDuration = Math.round(performance.now() - stepStartTime);
        stepDurations.push(stepDuration);

        if (!execResult.ok) {
          evidence.push({
            stepIndex: i,
            actionType: step.actionType,
            interactable: false,
            visible: false,
            navigationChanged: false,
            url: previousUrl,
            timing: stepDuration,
            consoleErrors: [],
          });
          divergences.push({
            type: 'interaction-failed',
            stepIndex: i,
            expected: `${step.actionType} should execute`,
            actual: execResult.error,
          });
          if (!stepFailed) {
            stepFailed = true;
          }
          continue;
        }

        const execValue = execResult.value;

        // Collect evidence
        const ev = await this.evidenceCollector.collect(
          step,
          execValue,
          managedSession.browserContext,
          previousUrl,
        );
        ev.stepIndex = i;
        evidence.push(ev);

        // Detect divergences
        const stepDivergences = this.divergenceDetector.detect(
          step,
          execValue,
          ev,
          previousUrl,
        );
        for (const d of stepDivergences) {
          d.stepIndex = i;
          divergences.push(d);
        }

        // Update previous URL
        if (ev.navigationChanged) {
          previousUrl = ev.url;
        }

        // Mark first failure
        if (!execValue.success && !stepFailed) {
          stepFailed = true;
        }
      }

      // 4. Cleanup
      await this.sessionManager.endSession(managedSession).catch(() => {});

      const finishedAt = Date.now();

      const failedEvidence = evidence.find(e => !e.interactable || !e.visible);
      const failedStepId = failedEvidence ? session.steps[failedEvidence.stepIndex]?.stepId : undefined;

      return success({
        evidence,
        divergences,
        executedStepCount: evidence.length,
        totalStepCount: session.steps.length,
        timing: {
          startedAt,
          finishedAt,
          totalDuration: finishedAt - startedAt,
          stepDurations,
        },
        failedStepId,
      });
    } catch (err) {
      await this.sessionManager.endSession(managedSession).catch(() => {});
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Shut down the browser instance.
   */
  async shutdown(): Promise<Result<void>> {
    return this.sessionManager.shutdown();
  }

  /**
   * Generate a RuntimeValidationResult from a coordinator result.
   */
  buildValidationResult(
    coordinatorResult: CoordinatorResult,
    session: ReplaySession,
    proposal: HealingCandidate,
    browserMetadata: BrowserMetadata,
  ): RuntimeValidationResult {
    const falsePositives = this.fpDetector.detect(
      coordinatorResult.evidence,
      proposal,
      coordinatorResult.divergences,
    );

    const hasDiverged = coordinatorResult.divergences.length > 0;
    const hasFalsePositive = falsePositives.length > 0;
    const hasFailure = coordinatorResult.evidence.some(e => !e.interactable || !e.visible);
    const allSucceeded = coordinatorResult.evidence.every(e => e.interactable);

    let status: RuntimeValidationResult['status'];
    if (hasDiverged) {
      status = 'diverged';
    } else if (hasFalsePositive) {
      status = 'ambiguous';
    } else if (hasFailure) {
      status = 'failed';
    } else if (allSucceeded) {
      status = 'passed';
    } else {
      status = 'ambiguous';
    }

    // Compute runtime confidence
    const runtimeConfidence = this.computeConfidence(
      coordinatorResult,
      falsePositives,
      hasDiverged,
    );

    return {
      id: nextId(),
      replaySessionId: session.id,
      proposalId: proposal.id,
      status,
      executedStepCount: coordinatorResult.executedStepCount,
      totalStepCount: coordinatorResult.totalStepCount,
      failedStepId: coordinatorResult.failedStepId,
      runtimeConfidence,
      runtimeEvidence: coordinatorResult.evidence,
      timingMetadata: coordinatorResult.timing,
      browserMetadata,
      replayDivergence: coordinatorResult.divergences,
      falsePositiveIndicators: falsePositives,
      createdAt: Date.now(),
    };
  }

  private computeConfidence(
    result: CoordinatorResult,
    falsePositives: import('../../models/runtime.js').RuntimeFalsePositiveIndicator[],
    hasDiverged: boolean,
  ): number {
    if (result.evidence.length === 0) return 0;

    let score = 0;

    // Execution completeness (30%)
    const execRatio = result.executedStepCount / Math.max(1, result.totalStepCount);
    score += execRatio * 0.30;

    // Step success rate (30%)
    const successCount = result.evidence.filter(e => e.interactable && e.visible).length;
    const successRate = successCount / result.evidence.length;
    score += successRate * 0.30;

    // False-positive penalty (20%)
    const fpPenalty = Math.min(0.20, falsePositives.length * 0.05);
    score += Math.max(0, 0.20 - fpPenalty);

    // Divergence penalty (20%)
    const divPenalty = hasDiverged ? 0.15 : 0;
    score += Math.max(0, 0.20 - divPenalty);

    return Math.round(Math.min(1, Math.max(0, score)) * 10000) / 10000;
  }
}
