/**
 * Execution Plan
 *
 * Generates deterministic execution stage plans based on input options.
 *
 * No AI. No dynamic reordering. Deterministic stage sequencing.
 */

import type { ExecutionPlan, ExecutionStage, ExecutionStagePlan } from './types.js';

const ALL_STAGES: ExecutionStage[] = [
  'repository-analysis',
  'runtime-hardening',
  'failure-detection',
  'healing-execution',
  'validation',
  'sandbox-verification',
  'governance-review',
  'review-package-generation',
  'report-aggregation',
];

const STAGE_DEPENDENCIES: Record<ExecutionStage, ExecutionStage[]> = {
  'repository-analysis': [],
  'runtime-hardening': ['repository-analysis'],
  'failure-detection': ['repository-analysis'],
  'healing-execution': ['failure-detection', 'runtime-hardening'],
  'validation': ['healing-execution'],
  'sandbox-verification': ['validation'],
  'governance-review': ['validation'],
  'review-package-generation': ['sandbox-verification', 'governance-review'],
  'report-aggregation': ['review-package-generation'],
};

let planCounter = 0;
function nextPlanId(): string {
  planCounter++;
  return `plan-${planCounter}`;
}

export class ExecutionPlanGenerator {
  /**
   * Generate a full execution plan with all stages.
   */
  generateFullPlan(repoPath: string): ExecutionPlan {
    const stages: ExecutionStagePlan[] = ALL_STAGES.map(stage => ({
      stage,
      status: 'pending',
      dependsOn: STAGE_DEPENDENCIES[stage] ?? [],
    }));

    return {
      planId: nextPlanId(),
      repoPath,
      stages,
      createdAt: 0,
    };
  }

  /**
   * Generate a plan with only specified stages enabled.
   */
  generateSelectivePlan(repoPath: string, enabledStages: ExecutionStage[]): ExecutionPlan {
    const enabledSet = new Set(enabledStages);
    const stages: ExecutionStagePlan[] = ALL_STAGES.map(stage => ({
      stage,
      status: enabledSet.has(stage) ? 'pending' : 'skipped',
      dependsOn: STAGE_DEPENDENCIES[stage] ?? [],
    }));

    return {
      planId: nextPlanId(),
      repoPath,
      stages,
      createdAt: 0,
    };
  }

  /**
   * Generate a validation-only plan.
   */
  generateValidationOnlyPlan(repoPath: string): ExecutionPlan {
    return this.generateSelectivePlan(repoPath, [
      'repository-analysis',
      'runtime-hardening',
      'failure-detection',
      'validation',
      'report-aggregation',
    ]);
  }

  /**
   * Generate a healing-only plan.
   */
  generateHealingOnlyPlan(repoPath: string): ExecutionPlan {
    return this.generateSelectivePlan(repoPath, [
      'repository-analysis',
      'runtime-hardening',
      'failure-detection',
      'healing-execution',
      'validation',
      'report-aggregation',
    ]);
  }

  /**
   * Generate a report-only plan.
   */
  generateReportOnlyPlan(repoPath: string): ExecutionPlan {
    return this.generateSelectivePlan(repoPath, [
      'repository-analysis',
      'report-aggregation',
    ]);
  }
}
