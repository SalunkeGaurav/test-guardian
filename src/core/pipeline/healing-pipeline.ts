/**
 * HealingPipeline
 *
 * End-to-end orchestrator for healing proposal generation, validation,
 * and runtime verification, with explainability, governance, and audit.
 *
 * Flow:
 *   1. HealingEngine.heal()        — generate ranked candidates
 *   2. ValidationEngine.validate() — static validation against DOM
 *   3. ConfidenceGovernance        — deterministic approval gates
 *   4. ExplainabilityEngine        — generate reasoning for each candidate
 *   5. ReplayRuntime.validate()    — optional browser-based validation
 *   6. AuditPersister              — persist audit trail
 *
 * No patches. No AI.
 */

import type { Result } from '../../models/result.js';
import type { PipelineInput, PipelineResult, PipelineStatus, PipelineStage, PipelineSummary } from '../../models/pipeline.js';
import { success, failure } from '../../models/result.js';
import { HealingEngine } from '../healing/engine.js';
import { ValidationEngine } from '../validation/engine.js';
import { ReplayRuntime } from '../runtime/engine.js';
import { ExplainabilityEngine } from './explainability-engine.js';
import { ConfidenceGovernance } from './confidence-governance.js';
import type { GovernanceConfig, GovernanceResult } from './confidence-governance.js';
import { AuditPersister } from './audit-persister.js';
import type { HealingExplanation } from '../../models/healing-explanation.js';
import type { ValidationResult } from '../../models/validation.js';
import type { RuntimeValidationResult } from '../../models/runtime.js';
import type { AuditTrailEntry, RejectionDecision, StageTiming, StageOutput } from '../../models/audit-trail.js';

let pipelineCounter = 0;
function nextPipelineId(): string {
  pipelineCounter++;
  return `pipeline-${Date.now()}-${pipelineCounter}`;
}

export class HealingPipeline {
  private readonly healingEngine: HealingEngine;
  private readonly validationEngine: ValidationEngine;
  private readonly explainabilityEngine: ExplainabilityEngine;
  private readonly governance: ConfidenceGovernance;
  private readonly auditPersister?: AuditPersister;

  constructor(
    threshold?: number,
    governanceConfig?: Partial<GovernanceConfig>,
    auditRoot?: string,
  ) {
    this.healingEngine = new HealingEngine(threshold);
    this.validationEngine = new ValidationEngine();
    this.explainabilityEngine = new ExplainabilityEngine();
    this.governance = new ConfidenceGovernance(governanceConfig);
    if (auditRoot) {
      this.auditPersister = new AuditPersister(auditRoot);
    }
  }

  async run(input: PipelineInput): Promise<Result<PipelineResult>> {
    const pipelineRunId = nextPipelineId();
    const startedAt = Date.now();
    const stagesCompleted: PipelineStage[] = [];
    const stageTimings: StageTiming[] = [];
    const stageOutputs: StageOutput[] = [];
    const rejectionDecisions: RejectionDecision[] = [];
    let explanations: HealingExplanation[] = [];
    let governanceResult: GovernanceResult | undefined;

    try {
      // Stage 1: Healing — generate candidates
      const healStartedAt = Date.now();
      const healResult = this.healingEngine.heal({
        locator: input.locator,
        originalDom: input.originalDom,
        currentDom: input.currentDom,
        replaySession: input.replaySession,
      });

      const healFinishedAt = Date.now();
      stageTimings.push({ stage: 'healing', startedAt: healStartedAt, finishedAt: healFinishedAt, duration: healFinishedAt - healStartedAt });

      if (!healResult.ok) {
        stageOutputs.push({ stage: 'healing', candidateCount: 0, success: false, error: healResult.error });
        return failure(healResult.error);
      }

      stagesCompleted.push('healing');
      const candidates = healResult.value;
      stageOutputs.push({ stage: 'healing', candidateCount: candidates.length, success: true });

      // Stage 2: Validation — static DOM validation
      const valStartedAt = Date.now();
      const targetDom = input.targetDom ?? input.currentDom;
      const validationResults = new Map<string, ValidationResult>();

      for (const candidate of candidates) {
        const vr = this.validationEngine.validate({
          candidate,
          targetDom,
          replaySession: input.replaySession,
          stepIndex: input.stepIndex,
        });
        if (vr.ok) {
          validationResults.set(candidate.id, vr.value);
        }
      }

      const valFinishedAt = Date.now();
      stageTimings.push({ stage: 'validation', startedAt: valStartedAt, finishedAt: valFinishedAt, duration: valFinishedAt - valStartedAt });
      stagesCompleted.push('validation');
      const allValidationResults = Array.from(validationResults.values());
      stageOutputs.push({ stage: 'validation', candidateCount: allValidationResults.length, success: true });

      // Stage 3: Runtime — optional browser validation
      let runtimeResult: RuntimeValidationResult | undefined;
      if (input.browser && candidates.length > 0 && input.replaySession) {
        const runtimeStartedAt = Date.now();
        const bestCandidate = candidates[0]!;
        const runtime = new ReplayRuntime(input.browser);

        try {
          const rr = await runtime.validate(
            input.replaySession,
            bestCandidate,
            input.stepIndex,
            input.browserConfig,
          );
          if (rr.ok) {
            runtimeResult = rr.value;
          }
        } finally {
          await runtime.shutdown().catch(() => {});
        }

        const runtimeFinishedAt = Date.now();
        stageTimings.push({ stage: 'runtime', startedAt: runtimeStartedAt, finishedAt: runtimeFinishedAt, duration: runtimeFinishedAt - runtimeStartedAt });
        stagesCompleted.push('runtime');
        stageOutputs.push({ stage: 'runtime', candidateCount: 1, success: runtimeResult?.status === 'passed' });
      }

      // Stage 4: Governance — approval gates
      const govStartedAt = Date.now();
      governanceResult = this.governance.evaluate(candidates, validationResults, runtimeResult);

      for (const rejected of governanceResult.rejectedCandidates) {
        rejectionDecisions.push({
          stage: 'governance',
          candidateId: rejected.candidate.id,
          reason: rejected.reason,
          rule: rejected.gate,
        });
      }

      const govFinishedAt = Date.now();
      stageTimings.push({ stage: 'governance', startedAt: govStartedAt, finishedAt: govFinishedAt, duration: govFinishedAt - govStartedAt });
      stagesCompleted.push('governance');
      stageOutputs.push({
        stage: 'governance',
        candidateCount: governanceResult.approvedCandidates.length,
        success: governanceResult.passed,
        error: governanceResult.passed ? undefined : `${governanceResult.rejectedCandidates.length} candidate(s) rejected`,
      });

      // Stage 4b: Explainability — generate explanations for all candidates
      explanations = candidates.map(c => {
        const rejected = rejectionDecisions.find(r => r.candidateId === c.id);
        const rejectionReasons = rejected ? [rejected.reason] : [];
        return this.explainabilityEngine.explain(
          c,
          validationResults.get(c.id),
          c.id === candidates[0]?.id ? runtimeResult : undefined,
          undefined,
          undefined,
          rejectionReasons,
        );
      });

      // Build summary
      const passedCount = allValidationResults.filter(v => v.status === 'passed').length;
      const runtimeValidated = runtimeResult !== undefined;
      const runtimePassed = runtimeResult?.status === 'passed';

      const pipelineStatus: PipelineStatus = governanceResult.passed
        ? (runtimeValidated ? (runtimePassed ? 'completed' : 'partial') : 'completed')
        : 'rejected';

      const summary: PipelineSummary = {
        status: pipelineStatus,
        stagesCompleted,
        totalCandidates: candidates.length,
        validatedCount: allValidationResults.length,
        passedValidationCount: passedCount,
        runtimeValidated,
        runtimePassed,
        bestCandidateId: candidates[0]?.id,
        duration: Date.now() - startedAt,
        governancePassed: governanceResult.passed,
        approvedCandidateCount: governanceResult.approvedCandidates.length,
        rejectedCandidateCount: governanceResult.rejectedCandidates.length,
      };

      // Persist audit trail if persister is configured
      let auditTrailId: string | undefined;
      if (this.auditPersister) {
        const auditEntry: AuditTrailEntry = {
          id: `audit-${pipelineRunId}`,
          pipelineRunId,
          locatorId: input.locator.id,
          timestamp: startedAt,
          schemaVersion: 1,
          stageTimings,
          stageOutputs,
          candidateIds: candidates.map(c => c.id),
          validationOutcomes: allValidationResults,
          replayOutcome: runtimeResult,
          runtimeOutcome: undefined,
          rejectionDecisions,
          explanations,
          finalStatus: pipelineStatus,
          duration: Date.now() - startedAt,
        };

        const saveResult = await this.auditPersister.save(auditEntry);
        if (saveResult.ok) {
          auditTrailId = auditEntry.id;
        }
      }

      return success({
        status: pipelineStatus,
        stagesCompleted,
        candidates,
        validationResults: allValidationResults,
        runtimeResult,
        summary,
        explanations,
        governance: governanceResult,
        auditTrailId,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);

      // Persist failure audit trail if possible
      if (this.auditPersister) {
        const auditEntry: AuditTrailEntry = {
          id: `audit-${pipelineRunId}`,
          pipelineRunId,
          locatorId: input.locator.id,
          timestamp: startedAt,
          schemaVersion: 1,
          stageTimings,
          stageOutputs,
          candidateIds: [],
          validationOutcomes: [],
          replayOutcome: undefined,
          runtimeOutcome: undefined,
          rejectionDecisions,
          explanations: [],
          finalStatus: 'failed',
          duration: Date.now() - startedAt,
        };
        await this.auditPersister.save(auditEntry).catch(() => {});
      }

      return failure(error);
    }
  }
}
