/**
 * Unified Execution Runtime Module
 *
 * Single deterministic entrypoint for the full TestGuardian workflow:
 *   repository analysis → hardening → healing → validation → sandbox → governance → report
 *
 * @module unified-runtime
 */

export { UnifiedRuntime } from './unified-runtime.js';
export { RuntimeContextHolder } from './runtime-context.js';
export { ExecutionStateMachine } from './execution-state-machine.js';
export { ExecutionPlanGenerator } from './execution-plan.js';
export { WorkflowRouter } from './workflow-router.js';
export { FailureBoundary } from './failure-boundary.js';
export { ReportAggregator } from './report-aggregator.js';

export type {
  ExecutionStage,
  ExecutionStageStatus,
  ExecutionStagePlan,
  ExecutionPlan,
  RuntimeContext,
  ExecutionState,
  ExecutionStateTransition,
  ExecutionStateTransitionReport,
  WorkflowRoute,
  WorkflowRoutingDecision,
  FailureType,
  FailureBoundaryEvent,
  FailureBoundaryReport,
  UnifiedExecutionReport,
  UnifiedRuntimeInput,
  UnifiedRuntimeResult,
} from './types.js';
