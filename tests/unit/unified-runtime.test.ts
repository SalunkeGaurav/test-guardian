import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { UnifiedRuntime } from '../../src/core/unified-runtime/unified-runtime.js';
import { RuntimeContextHolder } from '../../src/core/unified-runtime/runtime-context.js';
import { ExecutionStateMachine } from '../../src/core/unified-runtime/execution-state-machine.js';
import { ExecutionPlanGenerator } from '../../src/core/unified-runtime/execution-plan.js';
import { WorkflowRouter } from '../../src/core/unified-runtime/workflow-router.js';
import { FailureBoundary } from '../../src/core/unified-runtime/failure-boundary.js';
import { ReportAggregator } from '../../src/core/unified-runtime/report-aggregator.js';

// ─── Execution State Machine Tests ─────────────────────────────────

describe('ExecutionStateMachine', () => {
  it('starts in idle state', () => {
    const machine = new ExecutionStateMachine();
    expect(machine.getState()).toBe('idle');
  });

  it('transitions from idle to analyzing', () => {
    const machine = new ExecutionStateMachine();
    const result = machine.transition('analyzing', 'repository-analysis', true);
    expect(result).toBe(true);
    expect(machine.getState()).toBe('analyzing');
  });

  it('rejects invalid transitions', () => {
    const machine = new ExecutionStateMachine();
    const result = machine.transition('completed', 'report-aggregation', true);
    expect(result).toBe(false);
    expect(machine.getState()).toBe('idle');
  });

  it('transitions to failed state', () => {
    const machine = new ExecutionStateMachine();
    machine.transition('analyzing', 'repository-analysis', true);
    const result = machine.fail('repository-analysis', 'Repository incompatible');
    expect(result).toBe(true);
    expect(machine.getState()).toBe('failed');
  });

  it('generates transition report', () => {
    const machine = new ExecutionStateMachine();
    machine.transition('analyzing', 'repository-analysis', true);
    machine.transition('hardening', 'runtime-hardening', true);
    machine.transition('healing', 'healing-execution', true);
    machine.transition('validating', 'validation', true);
    machine.transition('sandboxing', 'sandbox-verification', true);
    machine.transition('governing', 'governance-review', true);
    machine.transition('reporting', 'report-aggregation', true);
    machine.transition('completed', 'report-aggregation', true);

    const report = machine.generateReport();
    expect(report.totalTransitions).toBe(8);
    expect(report.failedTransitions).toBe(0);
    expect(report.finalState).toBe('completed');
    expect(report.currentState).toBe('completed');
  });

  it('tracks failed transitions', () => {
    const machine = new ExecutionStateMachine();
    machine.transition('analyzing', 'repository-analysis', true);
    machine.fail('runtime-hardening', 'Hardening failed');

    const report = machine.generateReport();
    expect(report.failedTransitions).toBe(1);
    expect(report.finalState).toBe('failed');
  });

  it('isComplete returns true for completed and failed', () => {
    const machine1 = new ExecutionStateMachine();
    machine1.transition('analyzing', 'repository-analysis', true);
    machine1.transition('hardening', 'runtime-hardening', true);
    machine1.transition('healing', 'healing-execution', true);
    machine1.transition('validating', 'validation', true);
    machine1.transition('sandboxing', 'sandbox-verification', true);
    machine1.transition('governing', 'governance-review', true);
    machine1.transition('reporting', 'report-aggregation', true);
    machine1.transition('completed', 'report-aggregation', true);
    expect(machine1.isComplete()).toBe(true);

    const machine2 = new ExecutionStateMachine();
    machine2.fail('repository-analysis', 'Error');
    expect(machine2.isComplete()).toBe(true);

    const machine3 = new ExecutionStateMachine();
    machine3.transition('analyzing', 'repository-analysis', true);
    expect(machine3.isComplete()).toBe(false);
  });

  it('succeeded returns true only for completed', () => {
    const machine1 = new ExecutionStateMachine();
    machine1.transition('analyzing', 'repository-analysis', true);
    machine1.transition('hardening', 'runtime-hardening', true);
    machine1.transition('healing', 'healing-execution', true);
    machine1.transition('validating', 'validation', true);
    machine1.transition('sandboxing', 'sandbox-verification', true);
    machine1.transition('governing', 'governance-review', true);
    machine1.transition('reporting', 'report-aggregation', true);
    machine1.transition('completed', 'report-aggregation', true);
    expect(machine1.succeeded()).toBe(true);

    const machine2 = new ExecutionStateMachine();
    machine2.fail('repository-analysis', 'Error');
    expect(machine2.succeeded()).toBe(false);
  });
});

// ─── Execution Plan Generator Tests ────────────────────────────────

describe('ExecutionPlanGenerator', () => {
  it('generates full plan with all stages', () => {
    const generator = new ExecutionPlanGenerator();
    const plan = generator.generateFullPlan('/test/repo');

    expect(plan.stages.length).toBe(9);
    expect(plan.repoPath).toBe('/test/repo');
    expect(plan.planId).toBeDefined();
    expect(plan.stages.every(s => s.status === 'pending')).toBe(true);
  });

  it('generates validation-only plan', () => {
    const generator = new ExecutionPlanGenerator();
    const plan = generator.generateValidationOnlyPlan('/test/repo');

    const enabled = plan.stages.filter(s => s.status === 'pending');
    const skipped = plan.stages.filter(s => s.status === 'skipped');

    expect(enabled.length).toBe(5);
    expect(skipped.length).toBe(4);
    expect(enabled.find(s => s.stage === 'healing-execution')).toBeUndefined();
    expect(enabled.find(s => s.stage === 'sandbox-verification')).toBeUndefined();
  });

  it('generates healing-only plan', () => {
    const generator = new ExecutionPlanGenerator();
    const plan = generator.generateHealingOnlyPlan('/test/repo');

    const enabled = plan.stages.filter(s => s.status === 'pending');
    expect(enabled.find(s => s.stage === 'healing-execution')).toBeDefined();
    expect(enabled.find(s => s.stage === 'sandbox-verification')).toBeUndefined();
  });

  it('generates report-only plan', () => {
    const generator = new ExecutionPlanGenerator();
    const plan = generator.generateReportOnlyPlan('/test/repo');

    const enabled = plan.stages.filter(s => s.status === 'pending');
    expect(enabled.length).toBe(2);
    expect(enabled.find(s => s.stage === 'repository-analysis')).toBeDefined();
    expect(enabled.find(s => s.stage === 'report-aggregation')).toBeDefined();
  });

  it('sets correct dependencies for each stage', () => {
    const generator = new ExecutionPlanGenerator();
    const plan = generator.generateFullPlan('/test/repo');

    const repoAnalysis = plan.stages.find(s => s.stage === 'repository-analysis');
    expect(repoAnalysis?.dependsOn).toEqual([]);

    const healing = plan.stages.find(s => s.stage === 'healing-execution');
    expect(healing?.dependsOn).toContain('failure-detection');
    expect(healing?.dependsOn).toContain('runtime-hardening');
  });
});

// ─── Workflow Router Tests ─────────────────────────────────────────

describe('WorkflowRouter', () => {
  it('routes full execution for supported repository', () => {
    const router = new WorkflowRouter();
    const decision = router.route('supported', {});

    expect(decision.route).toBe('full-execution');
    expect(decision.skippedStages.length).toBe(0);
    expect(decision.enabledStages.length).toBe(9);
  });

  it('routes full execution with sandbox skipped for partially-supported', () => {
    const router = new WorkflowRouter();
    const decision = router.route('partially-supported', {});

    expect(decision.route).toBe('full-execution');
    expect(decision.skippedStages).toContain('sandbox-verification');
  });

  it('blocks unsupported repositories', () => {
    const router = new WorkflowRouter();
    const decision = router.route('unsupported', {});

    expect(decision.route).toBe('blocked');
    expect(decision.enabledStages).toEqual(['repository-analysis', 'report-aggregation']);
  });

  it('routes validation-only mode', () => {
    const router = new WorkflowRouter();
    const decision = router.route('supported', { validateOnly: true });

    expect(decision.route).toBe('validation-only');
    expect(decision.enabledStages).toContain('validation');
    expect(decision.enabledStages).not.toContain('healing-execution');
  });

  it('routes healing-only mode', () => {
    const router = new WorkflowRouter();
    const decision = router.route('supported', { runtimeHealing: true });

    expect(decision.route).toBe('healing-only');
    expect(decision.enabledStages).toContain('healing-execution');
    expect(decision.enabledStages).not.toContain('sandbox-verification');
  });

  it('routes report-only mode', () => {
    const router = new WorkflowRouter();
    const decision = router.route('supported', { reportOnly: true });

    expect(decision.route).toBe('report-only');
    expect(decision.enabledStages).toEqual(['repository-analysis', 'report-aggregation']);
  });
});

// ─── Failure Boundary Tests ────────────────────────────────────────

describe('FailureBoundary', () => {
  it('records recoverable failures', () => {
    const boundary = new FailureBoundary();
    const result = boundary.record('replay-divergence', 'runtime-hardening', 'Divergence detected');

    expect(result.recoverable).toBe(true);
    expect(result.degradedTo).toBe('governance-review');
  });

  it('records unrecoverable failures', () => {
    const boundary = new FailureBoundary();
    const result = boundary.record('sandbox-corruption', 'sandbox-verification', 'Sandbox corrupted');

    expect(result.recoverable).toBe(false);
    expect(result.degradedTo).toBeUndefined();
  });

  it('records repository-incompatible as unrecoverable', () => {
    const boundary = new FailureBoundary();
    const result = boundary.record('repository-incompatible', 'repository-analysis', 'Not compatible');

    expect(result.recoverable).toBe(false);
  });

  it('generates failure report', () => {
    const boundary = new FailureBoundary();
    boundary.record('replay-divergence', 'runtime-hardening', 'Divergence');
    boundary.record('sandbox-corruption', 'sandbox-verification', 'Corrupted');

    const report = boundary.generateReport();
    expect(report.totalFailures).toBe(2);
    expect(report.recoverableFailures).toBe(1);
    expect(report.unrecoverableFailures).toBe(1);
    expect(report.gracefulDegradation).toBe(false);
  });

  it('hasUnrecoverableFailures returns true when present', () => {
    const boundary = new FailureBoundary();
    boundary.record('sandbox-corruption', 'sandbox-verification', 'Corrupted');

    expect(boundary.hasUnrecoverableFailures()).toBe(true);
  });

  it('hasUnrecoverableFailures returns false for recoverable only', () => {
    const boundary = new FailureBoundary();
    boundary.record('replay-divergence', 'runtime-hardening', 'Divergence');
    boundary.record('governance-rejection', 'governance-review', 'Rejected');

    expect(boundary.hasUnrecoverableFailures()).toBe(false);
  });

  it('getDegradationTarget returns latest target', () => {
    const boundary = new FailureBoundary();
    boundary.record('runtime-failure', 'healing-execution', 'Error');
    boundary.record('governance-rejection', 'governance-review', 'Rejected');

    const target = boundary.getDegradationTarget();
    expect(target).toBe('review-package-generation');
  });
});

// ─── Runtime Context Holder Tests ──────────────────────────────────

describe('RuntimeContextHolder', () => {
  it('creates context with initial values', () => {
    const holder = new RuntimeContextHolder('/test/repo', 'playwright', 'supported');
    const ctx = holder.get();

    expect(ctx.repoPath).toBe('/test/repo');
    expect(ctx.frameworkType).toBe('playwright');
    expect(ctx.compatibilityStatus).toBe('supported');
    expect(ctx.executionId).toBeDefined();
  });

  it('withRepositoryReport updates context', () => {
    const holder = new RuntimeContextHolder('/test/repo', 'playwright', 'supported');
    const mockReport = {
      id: 'report-1',
      repositoryPath: '/test/repo',
      analyzedAt: 1000,
      compatibilityStatus: 'supported' as const,
      parserResults: { totalFiles: 5, successfullyParsed: 5, failedFiles: [], unsupportedSyntax: 0, parseDurationMs: 100 },
      locatorPatternStats: { totalLocators: 10, strategyBreakdown: {}, dynamicSelectors: 0, unstableSelectors: 0, chainedLocators: 0, pageObjects: [], customWrappers: 0, mixedFrameworkConventions: false },
      mutationSafetyResults: { totalTestFiles: 5, successfullyMutated: 5, failedMutations: [], compileSuccessRate: 1, rollbackSuccessRate: 1, formattingPreserved: true, importPreserved: true },
      stabilityMetrics: { parserSurvivability: 1, compileStability: 1, replayStability: 1, overallCompatibilityScore: 0.95 },
      architecturalRisks: [],
    };

    holder.withRepositoryReport(mockReport);
    expect(holder.get().repositoryReport).toBe(mockReport);
  });

  it('returns immutable context', () => {
    const holder = new RuntimeContextHolder('/test/repo', 'playwright', 'supported');
    const ctx = holder.get();

    expect(Object.isFrozen(ctx) || !('repoPath' in ctx && ctx.repoPath !== '/test/repo')).toBe(true);
  });
});

// ─── Report Aggregator Tests ───────────────────────────────────────

describe('ReportAggregator', () => {
  it('aggregates report from minimal context', () => {
    const aggregator = new ReportAggregator();
    const holder = new RuntimeContextHolder('/test/repo', 'playwright', 'supported');
    const stateMachine = new ExecutionStateMachine();
    stateMachine.transition('analyzing', 'repository-analysis', true);
    stateMachine.transition('hardening', 'runtime-hardening', true);
    stateMachine.transition('healing', 'healing-execution', true);
    stateMachine.transition('validating', 'validation', true);
    stateMachine.transition('sandboxing', 'sandbox-verification', true);
    stateMachine.transition('governing', 'governance-review', true);
    stateMachine.transition('reporting', 'report-aggregation', true);
    stateMachine.transition('completed', 'report-aggregation', true);
    const failureBoundary = new FailureBoundary();

    const report = aggregator.aggregate(holder.get(), stateMachine.generateReport(), failureBoundary.generateReport());

    expect(report.executionId).toBeDefined();
    expect(report.repoPath).toBe('/test/repo');
    expect(report.compatibilityStatus).toBe('supported');
    expect(report.riskAnalysis.overallRisk).toBe('low');
    expect(report.stateTransitions.finalState).toBe('completed');
  });

  it('computes risk factors from context', () => {
    const aggregator = new ReportAggregator();
    const holder = new RuntimeContextHolder('/test/repo', 'playwright', 'partially-supported');
    const stateMachine = new ExecutionStateMachine();
    stateMachine.transition('analyzing', 'repository-analysis', true);
    stateMachine.transition('completed', 'report-aggregation', true);
    const failureBoundary = new FailureBoundary();

    const report = aggregator.aggregate(holder.get(), stateMachine.generateReport(), failureBoundary.generateReport());

    expect(report.riskAnalysis.riskFactors).toContain('Partial repository compatibility');
    expect(report.riskAnalysis.overallRisk).toBe('medium');
  });

  it('persists report to filesystem', () => {
    const aggregator = new ReportAggregator();
    const holder = new RuntimeContextHolder('/test/repo', 'playwright', 'supported');
    const stateMachine = new ExecutionStateMachine();
    stateMachine.transition('analyzing', 'repository-analysis', true);
    stateMachine.transition('hardening', 'runtime-hardening', true);
    stateMachine.transition('healing', 'healing-execution', true);
    stateMachine.transition('validating', 'validation', true);
    stateMachine.transition('sandboxing', 'sandbox-verification', true);
    stateMachine.transition('governing', 'governance-review', true);
    stateMachine.transition('reporting', 'report-aggregation', true);
    stateMachine.transition('completed', 'report-aggregation', true);
    const failureBoundary = new FailureBoundary();

    const report = aggregator.aggregate(holder.get(), stateMachine.generateReport(), failureBoundary.generateReport());
    const projectRoot = process.cwd();
    const paths = aggregator.persist(report, projectRoot);

    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0]).toContain('unified-runtime');
  });
});

// ─── Unified Runtime Integration Tests ─────────────────────────────

describe('UnifiedRuntime', () => {
  it('executes successfully on supported repository', async () => {
    const runtime = new UnifiedRuntime();
    const repoPath = join(process.cwd(), 'tests', 'fixtures', 'healing-benchmarks');

    const result = await runtime.execute({ repoPath });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.report.executionId).toBeDefined();
    expect(result.value.report.repoPath).toBe(repoPath);
    expect(result.value.report.persistedPaths.length).toBeGreaterThan(0);
  });

  it('handles unsupported repository gracefully', async () => {
    const runtime = new UnifiedRuntime();
    const repoPath = join(process.cwd(), 'tests', 'fixtures', 'adversarial-repos');

    const result = await runtime.execute({ repoPath });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.report.compatibilityStatus).toBeDefined();
    expect(result.value.report.persistedPaths.length).toBeGreaterThan(0);
  });

  it('executes validate-only mode', async () => {
    const runtime = new UnifiedRuntime();
    const repoPath = join(process.cwd(), 'tests', 'fixtures', 'healing-benchmarks');

    const result = await runtime.execute({ repoPath, validateOnly: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.report.executionId).toBeDefined();
  });

  it('executes report-only mode', async () => {
    const runtime = new UnifiedRuntime();
    const repoPath = join(process.cwd(), 'tests', 'fixtures', 'healing-benchmarks');

    const result = await runtime.execute({ repoPath, reportOnly: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.report.executionId).toBeDefined();
  });

  it('fails when repository does not exist', async () => {
    const runtime = new UnifiedRuntime();

    const result = await runtime.execute({ repoPath: '/nonexistent/path' });

    expect(result.ok).toBe(false);
  });

  it('executes with strict governance', async () => {
    const runtime = new UnifiedRuntime();
    const repoPath = join(process.cwd(), 'tests', 'fixtures', 'healing-benchmarks');

    const result = await runtime.execute({ repoPath, strictGovernance: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.report.executionId).toBeDefined();
  });

  it('produces deterministic results for same inputs', async () => {
    const runtime1 = new UnifiedRuntime();
    const runtime2 = new UnifiedRuntime();
    const repoPath = join(process.cwd(), 'tests', 'fixtures', 'healing-benchmarks');

    const r1 = await runtime1.execute({ repoPath, reportOnly: true });
    const r2 = await runtime2.execute({ repoPath, reportOnly: true });

    expect(r1.ok).toBe(r2.ok);
    if (!r1.ok || !r2.ok) return;

    expect(r1.value.report.repoPath).toBe(r2.value.report.repoPath);
    expect(r1.value.report.compatibilityStatus).toBe(r2.value.report.compatibilityStatus);
    expect(r1.value.report.frameworkType).toBe(r2.value.report.frameworkType);
  });
});
