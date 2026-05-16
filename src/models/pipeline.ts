/**
 * Healing Pipeline models.
 *
 * PipelineResult captures the outcome of the full healing pipeline:
 *   HealingEngine → ValidationEngine → ReplayRuntime
 *
 * No AI. No patches. No filesystem modification.
 */

import type { HealingCandidate } from './healing-candidate.js';
import type { ValidationResult } from './validation.js';
import type { RuntimeValidationResult } from './runtime.js';
import type { ElementNode } from './snapshot.js';
import type { Locator } from './locator.js';
import type { ReplaySession } from './replay.js';
import type { BrowserConfig } from './runtime.js';
import type { BrowserEngine } from '../core/runtime/browser.js';
import type { HealingExplanation } from './healing-explanation.js';
import type { GovernanceResult } from '../core/pipeline/confidence-governance.js';
import type { StabilityReport } from './stability.js';

export type PipelineStatus = 'completed' | 'partial' | 'failed' | 'rejected';
export type PipelineStage = 'healing' | 'validation' | 'runtime' | 'governance' | 'stability';

export interface PipelineInput {
  locator: Locator;
  originalDom: ElementNode[];
  currentDom: ElementNode[];
  targetDom?: ElementNode[];
  replaySession?: ReplaySession;
  stepIndex: number;
  browser?: BrowserEngine;
  browserConfig?: BrowserConfig;
  confidenceThreshold?: number;
}

export interface PipelineSummary {
  status: PipelineStatus;
  stagesCompleted: PipelineStage[];
  totalCandidates: number;
  validatedCount: number;
  passedValidationCount: number;
  runtimeValidated: boolean;
  runtimePassed: boolean;
  bestCandidateId?: string;
  duration: number;
  governancePassed: boolean;
  approvedCandidateCount: number;
  rejectedCandidateCount: number;
}

export interface PipelineResult {
  status: PipelineStatus;
  stagesCompleted: PipelineStage[];
  candidates: HealingCandidate[];
  validationResults: ValidationResult[];
  runtimeResult?: RuntimeValidationResult;
  summary: PipelineSummary;
  explanations?: HealingExplanation[];
  governance?: GovernanceResult;
  stability?: StabilityReport;
  auditTrailId?: string;
  error?: string;
}
