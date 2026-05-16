import { describe, it, expect } from 'vitest';
import { PerformanceProfiler } from '../../src/core/production-readiness/performance-profiler.js';
import { MemoryStability } from '../../src/core/production-readiness/memory-stability.js';
import { APISurfaceAudit } from '../../src/core/production-readiness/api-surface-audit.js';
import { CIIntegration } from '../../src/core/production-readiness/ci-integration.js';
import type { APIExportEntry } from '../../src/core/production-readiness/types.js';
import type { UnifiedExecutionReport } from '../../src/core/unified-runtime/types.js';
import type { RepositoryValidationReport } from '../../src/core/repository-validator/types.js';

function createMockExecutionReport(overrides: Partial<UnifiedExecutionReport> = {}): UnifiedExecutionReport {
  return {
    executionId: 'exec-1',
    repoPath: '/test/repo',
    frameworkType: 'playwright',
    compatibilityStatus: 'supported',
    repositorySummary: { totalFiles: 10, totalLocators: 20, compatibilityScore: 0.8, risks: 1 },
    healingSummary: { totalAttempts: 2, successfulHealings: 1, reviewPackages: 1 },
    validationOutcomes: { totalValidations: 5, passed: 4, failed: 1 },
    replayStability: { domStabilized: true, replayDeterministic: true, driftSeverity: 'none' },
    governanceDecisions: { governancePassed: true, gatesPassed: 3, gatesFailed: 0 },
    sandboxVerification: { sandboxExecuted: true, compileSuccess: true, isolationVerified: true },
    patchProposals: { totalProposals: 1, status: 'applied' },
    rollbackMetadata: { rollbackAvailable: false },
    riskAnalysis: { overallRisk: 'low', riskFactors: [] },
    runtimeMetrics: {
      domStabilizationSuccessRate: 1,
      replayRecoverySuccess: 1,
      staleRecoverySuccess: 1,
      iframeRecoveryRate: 1,
      asyncRenderInstabilityFrequency: 0,
      replayDriftFrequency: 0,
    },
    stateTransitions: { transitions: [], currentState: 'completed', finalState: 'completed', totalTransitions: 5, failedTransitions: 0 },
    failureBoundary: { events: [], totalFailures: 0, recoverableFailures: 0, unrecoverableFailures: 0, gracefulDegradation: true },
    persistedPaths: [],
    completedAt: 0,
    ...overrides,
  };
}

function createMockRepoReport(overrides: Partial<RepositoryValidationReport> = {}): RepositoryValidationReport {
  return {
    id: 'repo-1',
    repositoryPath: '/test/repo',
    analyzedAt: 0,
    compatibilityStatus: 'supported',
    parserResults: {
      totalFiles: 10,
      successfullyParsed: 10,
      failedFiles: [],
      unsupportedSyntax: [],
      parseDurationMs: 100,
    },
    locatorPatternStats: {
      totalLocators: 50,
      strategyBreakdown: { css: 30, xpath: 10, testid: 10 },
      dynamicSelectors: 5,
      unstableSelectors: 2,
      chainedLocators: 3,
      pageObjects: [],
      customWrappers: 1,
      mixedFrameworkConventions: [],
    },
    mutationSafetyResults: { safeMutations: 8, unsafeMutations: 2, totalMutations: 10 },
    stabilityMetrics: {
      parserSurvivability: 1,
      compileStability: 0.9,
      replayStability: 0.95,
      overallCompatibilityScore: 0.8,
    },
    architecturalRisks: [],
    ...overrides,
  };
}

describe('PerformanceProfiler', () => {
  it('profiles execution report deterministically', () => {
    const profiler = new PerformanceProfiler();
    const profile = profiler.profile(
      '/test/repo',
      createMockExecutionReport(),
      createMockRepoReport(),
    );

    expect(profile.profileId).toBeDefined();
    expect(profile.repoPath).toBe('/test/repo');
    expect(profile.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(profile.parsingDurationMs).toBe(100);
    expect(profile.generatedAt).toBe(0);
  });

  it('detects bottleneck stage', () => {
    const profiler = new PerformanceProfiler();
    const profile = profiler.profile(
      '/test/repo',
      createMockExecutionReport({
        healingSummary: { totalAttempts: 10, successfulHealings: 5, reviewPackages: 2 },
      }),
      createMockRepoReport(),
    );

    expect(profile.bottleneckStage).toBeDefined();
    expect(profile.bottleneckDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('handles empty execution report', () => {
    const profiler = new PerformanceProfiler();
    const profile = profiler.profile(
      '/test/repo',
      createMockExecutionReport({
        healingSummary: { totalAttempts: 0, successfulHealings: 0, reviewPackages: 0 },
        validationOutcomes: { totalValidations: 0, passed: 0, failed: 0 },
        sandboxVerification: { sandboxExecuted: false, compileSuccess: false, isolationVerified: false },
        governanceDecisions: { governancePassed: false, gatesPassed: 0, gatesFailed: 0 },
      }),
      createMockRepoReport({
        parserResults: {
          totalFiles: 0,
          successfullyParsed: 0,
          failedFiles: [],
          unsupportedSyntax: [],
          parseDurationMs: 0,
        },
      }),
    );

    expect(profile.totalDurationMs).toBe(0);
    expect(profile.bottleneckStage).toBe('none');
  });
});

describe('MemoryStability', () => {
  it('analyzes memory stability deterministically', () => {
    const stability = new MemoryStability();
    const report = stability.analyze(
      '/test/repo',
      createMockExecutionReport(),
      createMockRepoReport(),
    );

    expect(report.reportId).toBeDefined();
    expect(report.repoPath).toBe('/test/repo');
    expect(report.snapshotAccumulation.totalSnapshots).toBe(5);
    expect(report.repositoryScaling.fileCount).toBe(10);
    expect(report.repositoryScaling.locatorCount).toBe(50);
    expect(report.generatedAt).toBe(0);
  });

  it('detects efficient scaling', () => {
    const stability = new MemoryStability();
    const report = stability.analyze(
      '/test/repo',
      createMockExecutionReport(),
      createMockRepoReport({
        parserResults: {
          totalFiles: 50,
          successfullyParsed: 50,
          failedFiles: [],
          unsupportedSyntax: [],
          parseDurationMs: 100,
        },
        locatorPatternStats: {
          totalLocators: 100,
          strategyBreakdown: { css: 60, xpath: 20, testid: 20 },
          dynamicSelectors: 5,
          unstableSelectors: 2,
          chainedLocators: 3,
          pageObjects: [],
          customWrappers: 1,
          mixedFrameworkConventions: [],
        },
        mutationSafetyResults: { safeMutations: 8, unsafeMutations: 2, totalMutations: 10 },
        stabilityMetrics: {
          parserSurvivability: 1,
          compileStability: 0.9,
          replayStability: 0.95,
          overallCompatibilityScore: 0.8,
        },
        architecturalRisks: [],
      }),
    );

    expect(report.repositoryScaling.scalingEfficiency).toBe('efficient');
  });

  it('detects inefficient scaling', () => {
    const stability = new MemoryStability();
    const report = stability.analyze(
      '/test/repo',
      createMockExecutionReport(),
      createMockRepoReport({
        parserResults: {
          totalFiles: 1,
          successfullyParsed: 1,
          failedFiles: [],
          unsupportedSyntax: [],
          parseDurationMs: 100,
        },
        locatorPatternStats: {
          totalLocators: 100,
          strategyBreakdown: { css: 60, xpath: 20, testid: 20 },
          dynamicSelectors: 5,
          unstableSelectors: 2,
          chainedLocators: 3,
          pageObjects: [],
          customWrappers: 1,
          mixedFrameworkConventions: [],
        },
        mutationSafetyResults: { safeMutations: 8, unsafeMutations: 2, totalMutations: 10 },
        stabilityMetrics: {
          parserSurvivability: 1,
          compileStability: 0.9,
          replayStability: 0.95,
          overallCompatibilityScore: 0.8,
        },
        architecturalRisks: [],
      }),
    );

    expect(report.repositoryScaling.scalingEfficiency).toBe('inefficient');
  });

  it('detects excessive snapshot accumulation', () => {
    const stability = new MemoryStability();
    const report = stability.analyze(
      '/test/repo',
      createMockExecutionReport({
        validationOutcomes: { totalValidations: 150, passed: 100, failed: 50 },
        runtimeMetrics: {
          domStabilizationSuccessRate: 1,
          replayRecoverySuccess: 1,
          staleRecoverySuccess: 1,
          iframeRecoveryRate: 1,
          asyncRenderInstabilityFrequency: 0,
          replayDriftFrequency: 0,
        },
      }),
      createMockRepoReport(),
    );

    expect(report.snapshotAccumulation.excessiveAccumulation).toBe(true);
  });
});

describe('APISurfaceAudit', () => {
  it('audits API surface deterministically', () => {
    const audit = new APISurfaceAudit();
    const exports: APIExportEntry[] = [
      { name: 'HealingPipeline', type: 'class', module: 'src/index', isInternal: false },
      { name: 'ValidationEngine', type: 'class', module: 'src/index', isInternal: false },
      { name: '_internalHelper', type: 'function', module: 'src/index', isInternal: true },
    ];

    const report = audit.audit(exports);

    expect(report.auditId).toBeDefined();
    expect(report.totalExports).toBe(3);
    expect(report.totalLeaks).toBe(1);
    expect(report.leakedInternals.length).toBe(1);
    expect(report.generatedAt).toBe(0);
  });

  it('detects duplicate exposures', () => {
    const audit = new APISurfaceAudit();
    const exports: APIExportEntry[] = [
      { name: 'HealingPipeline', type: 'class', module: 'src/index', isInternal: false },
      { name: 'HealingPipeline', type: 'class', module: 'src/core/index', isInternal: false },
    ];

    const report = audit.audit(exports);

    expect(report.totalDuplicates).toBe(1);
    expect(report.duplicateExposures[0].name).toBe('HealingPipeline');
    expect(report.duplicateExposures[0].modules).toEqual(['src/core/index', 'src/index']);
  });

  it('detects naming inconsistencies', () => {
    const audit = new APISurfaceAudit();
    const exports: APIExportEntry[] = [
      { name: 'healingPipeline', type: 'class', module: 'src/index', isInternal: false },
      { name: 'VALIDATION_ENGINE', type: 'class', module: 'src/index', isInternal: false },
    ];

    const report = audit.audit(exports);

    expect(report.totalInconsistencies).toBe(2);
  });

  it('produces deterministic output for same input', () => {
    const audit = new APISurfaceAudit();
    const exports: APIExportEntry[] = [
      { name: 'HealingPipeline', type: 'class', module: 'src/index', isInternal: false },
      { name: '_internalHelper', type: 'function', module: 'src/index', isInternal: true },
    ];

    const report1 = audit.audit(exports);
    const report2 = audit.audit(exports);

    expect(report1.totalExports).toBe(report2.totalExports);
    expect(report1.totalLeaks).toBe(report2.totalLeaks);
    expect(report1.totalDuplicates).toBe(report2.totalDuplicates);
  });
});

describe('CIIntegration', () => {
  it('generates CI integration report deterministically', () => {
    const ci = new CIIntegration();
    const report = ci.generateIntegrationReport('/test/repo');

    expect(report.reportId).toBeDefined();
    expect(report.githubActionsWorkflow).toContain('name: TestGuardian CI');
    expect(report.executionPlans.length).toBe(4);
    expect(report.supportedModes).toEqual(['validation-only', 'report-only', 'strict-governance', 'full']);
    expect(report.generatedAt).toBe(0);
  });

  it('generates validation-only plan', () => {
    const ci = new CIIntegration();
    const report = ci.generateIntegrationReport('/test/repo');

    const validationPlan = report.executionPlans.find((p) => p.mode === 'validation-only');
    expect(validationPlan).toBeDefined();
    expect(validationPlan!.steps.length).toBeGreaterThan(0);
    expect(validationPlan!.steps[0].dependsOn).toEqual([]);
  });

  it('generates full plan with all steps', () => {
    const ci = new CIIntegration();
    const report = ci.generateIntegrationReport('/test/repo');

    const fullPlan = report.executionPlans.find((p) => p.mode === 'full');
    expect(fullPlan).toBeDefined();
    expect(fullPlan!.steps.some((s) => s.command.includes('production-readiness'))).toBe(true);
  });

  it('generates deterministic workflow for same input', () => {
    const ci = new CIIntegration();
    const report1 = ci.generateIntegrationReport('/test/repo');
    const report2 = ci.generateIntegrationReport('/test/repo');

    expect(report1.githubActionsWorkflow).toBe(report2.githubActionsWorkflow);
    expect(report1.executionPlans.length).toBe(report2.executionPlans.length);
  });
});
