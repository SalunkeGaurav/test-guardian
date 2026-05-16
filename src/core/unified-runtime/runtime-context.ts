/**
 * Runtime Context
 *
 * Centralized immutable execution context for the unified runtime.
 * Tracks all state across stages without cross-module hidden coupling.
 *
 * No AI. No mutable global state. Deterministic context propagation.
 */

import type { RuntimeContext } from './types.js';
import type { RepositoryValidationReport } from '../repository-validator/types.js';
import type { RuntimeHardeningResult } from '../runtime-hardening/types.js';
import type { RuntimeHealingLoopResult } from '../runtime-healing-loop/types.js';
import type { SandboxExecutionResult } from '../sandbox/mutation-sandbox.js';
import type { GovernanceResult } from '../pipeline/confidence-governance.js';
import type { RuntimeHealingReviewPackage } from '../runtime-healing-loop/types.js';
import type { PipelineResult } from '../../models/pipeline.js';
import type { ValidationResult } from '../../models/validation.js';
import type { HealingExplanation } from '../../models/healing-explanation.js';

let contextCounter = 0;
function nextExecutionId(): string {
  contextCounter++;
  return `exec-${contextCounter}`;
}

export class RuntimeContextHolder {
  private context: RuntimeContext;

  constructor(repoPath: string, frameworkType: string, compatibilityStatus: string) {
    this.context = {
      repoPath,
      frameworkType,
      compatibilityStatus: compatibilityStatus as RuntimeContext['compatibilityStatus'],
      executionId: nextExecutionId(),
      startedAt: 0,
    };
  }

  get(): Readonly<RuntimeContext> {
    return this.context;
  }

  withRepositoryReport(report: RepositoryValidationReport): RuntimeContextHolder {
    this.context = { ...this.context, repositoryReport: report };
    return this;
  }

  withHardeningResult(result: RuntimeHardeningResult): RuntimeContextHolder {
    this.context = { ...this.context, hardeningResult: result };
    return this;
  }

  withHealingResult(result: RuntimeHealingLoopResult): RuntimeContextHolder {
    this.context = { ...this.context, healingResult: result };
    return this;
  }

  withPipelineResult(result: PipelineResult): RuntimeContextHolder {
    this.context = { ...this.context, pipelineResult: result };
    return this;
  }

  withSandboxResult(result: SandboxExecutionResult): RuntimeContextHolder {
    this.context = { ...this.context, sandboxResult: result };
    return this;
  }

  withGovernanceResult(result: GovernanceResult): RuntimeContextHolder {
    this.context = { ...this.context, governanceResult: result };
    return this;
  }

  withReviewPackage(pkg: RuntimeHealingReviewPackage): RuntimeContextHolder {
    this.context = { ...this.context, reviewPackage: pkg };
    return this;
  }

  withValidationResults(results: ValidationResult[]): RuntimeContextHolder {
    this.context = { ...this.context, validationResults: results };
    return this;
  }

  withExplanations(explanations: HealingExplanation[]): RuntimeContextHolder {
    this.context = { ...this.context, explanations };
    return this;
  }

  withStartedAt(timestamp: number): RuntimeContextHolder {
    this.context = { ...this.context, startedAt: timestamp };
    return this;
  }
}
