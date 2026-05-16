/**
 * Workflow Router
 *
 * Routes execution based on repository characteristics.
 * Avoids running incompatible workflows.
 *
 * No AI. No autonomous routing decisions. Deterministic routing rules.
 */

import type { CompatibilityStatus } from '../repository-validator/types.js';
import type { WorkflowRoutingDecision, WorkflowRoute, ExecutionStage } from './types.js';

export class WorkflowRouter {
  /**
   * Route execution based on repository compatibility status and options.
   */
  route(
    compatibilityStatus: CompatibilityStatus,
    options: {
      sandbox?: boolean;
      validateOnly?: boolean;
      runtimeHealing?: boolean;
      strictGovernance?: boolean;
      reportOnly?: boolean;
    },
  ): WorkflowRoutingDecision {
    if (options.reportOnly) {
      return this.routeReportOnly(compatibilityStatus);
    }

    if (options.validateOnly) {
      return this.routeValidationOnly(compatibilityStatus);
    }

    if (options.runtimeHealing) {
      return this.routeHealingOnly(compatibilityStatus);
    }

    return this.routeFullExecution(compatibilityStatus);
  }

  private routeFullExecution(status: CompatibilityStatus): WorkflowRoutingDecision {
    switch (status) {
      case 'supported':
        return {
          route: 'full-execution',
          reason: 'Repository fully supported; all stages enabled',
          compatibilityStatus: status,
          skippedStages: [],
          enabledStages: this.allStages(),
        };
      case 'partially-supported':
        return {
          route: 'full-execution',
          reason: 'Repository partially supported; sandbox verification skipped',
          compatibilityStatus: status,
          skippedStages: ['sandbox-verification'],
          enabledStages: this.allStages().filter(s => s !== 'sandbox-verification'),
        };
      case 'unsupported':
        return {
          route: 'blocked',
          reason: 'Repository not compatible with TestGuardian workflow',
          compatibilityStatus: status,
          skippedStages: this.allStages(),
          enabledStages: ['repository-analysis', 'report-aggregation'],
        };
      default:
        return {
          route: 'blocked',
          reason: 'Unknown compatibility status',
          compatibilityStatus: status,
          skippedStages: this.allStages(),
          enabledStages: ['repository-analysis', 'report-aggregation'],
        };
    }
  }

  private routeValidationOnly(status: CompatibilityStatus): WorkflowRoutingDecision {
    return {
      route: 'validation-only',
      reason: 'Validation-only mode requested',
      compatibilityStatus: status,
      skippedStages: ['healing-execution', 'sandbox-verification', 'governance-review', 'review-package-generation'],
      enabledStages: ['repository-analysis', 'runtime-hardening', 'failure-detection', 'validation', 'report-aggregation'],
    };
  }

  private routeHealingOnly(status: CompatibilityStatus): WorkflowRoutingDecision {
    return {
      route: 'healing-only',
      reason: 'Runtime healing mode requested',
      compatibilityStatus: status,
      skippedStages: ['sandbox-verification', 'governance-review'],
      enabledStages: ['repository-analysis', 'runtime-hardening', 'failure-detection', 'healing-execution', 'validation', 'review-package-generation', 'report-aggregation'],
    };
  }

  private routeReportOnly(_status: CompatibilityStatus): WorkflowRoutingDecision {
    return {
      route: 'report-only',
      reason: 'Report-only mode requested',
      compatibilityStatus: 'supported',
      skippedStages: ['runtime-hardening', 'failure-detection', 'healing-execution', 'validation', 'sandbox-verification', 'governance-review', 'review-package-generation'],
      enabledStages: ['repository-analysis', 'report-aggregation'],
    };
  }

  private allStages(): ExecutionStage[] {
    return [
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
  }
}
