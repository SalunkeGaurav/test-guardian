/**
 * Pipeline Audit Trail schema.
 *
 * Persists every stage of the healing pipeline for reproducibility,
 * debugging, and compliance. Each pipeline run produces a single
 * audit entry with stage-level timings, outputs, and decisions.
 *
 * No AI. No patches. Read-only logging.
 */

import type { PipelineStage } from './pipeline.js';
import type { HealingCandidate } from './healing-candidate.js';
import type { ValidationResult } from './validation.js';
import type { RuntimeValidationResult } from './runtime.js';
import type { HealingExplanation } from './healing-explanation.js';

export interface RejectionDecision {
  stage: PipelineStage;
  candidateId: string;
  reason: string;
  rule: string;
}

export interface StageTiming {
  stage: PipelineStage;
  startedAt: number;
  finishedAt: number;
  duration: number;
}

export interface StageOutput {
  stage: PipelineStage;
  candidateCount: number;
  success: boolean;
  error?: string;
}

export interface AuditTrailEntry {
  id: string;
  pipelineRunId: string;
  locatorId: string;
  timestamp: number;
  schemaVersion: number;
  stageTimings: StageTiming[];
  stageOutputs: StageOutput[];
  candidateIds: string[];
  validationOutcomes: ValidationResult[];
  replayOutcome?: RuntimeValidationResult;
  runtimeOutcome?: RuntimeValidationResult;
  rejectionDecisions: RejectionDecision[];
  explanations: HealingExplanation[];
  finalStatus: string;
  duration: number;
}

export type AuditTrailSummary = Pick<
  AuditTrailEntry,
  'id' | 'pipelineRunId' | 'locatorId' | 'timestamp' | 'finalStatus' | 'duration'
> & { candidateCount: number; stagesCompleted: number };

export const AUDIT_SCHEMA_VERSION = 1;
export const AUDIT_STORAGE_DIR = 'audit';
