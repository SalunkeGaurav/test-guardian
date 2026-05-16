import { describe, it, expect } from 'vitest';
import { ExecutionScheduler } from '../../src/core/execution-lab/execution-scheduler.js';
import { EvidenceCollector } from '../../src/core/execution-lab/evidence-collector.js';
import { FailureClusterAnalyzer } from '../../src/core/execution-lab/failure-cluster-analyzer.js';
import { ReliabilityTrendAnalyzer } from '../../src/core/execution-lab/reliability-trend-analyzer.js';
import { UnsupportedPatternDetector } from '../../src/core/execution-lab/unsupported-pattern-detector.js';
import { OperationalInsights } from '../../src/core/execution-lab/operational-insights.js';
import type {
  ExecutionBatchReport,
  RepositoryExecutionResult,
  EvidenceCollection,
  OperationalEvidenceRecord,
} from '../../src/core/execution-lab/types.js';

function createMockResult(overrides: Partial<RepositoryExecutionResult> = {}): RepositoryExecutionResult {
  return {
    repoPath: '/test/repo',
    executionId: 'exec-1',
    iteration: 1,
    success: true,
    report: {
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
    },
    error: null,
    healingAttempts: 2,
    successfulHealings: 1,
    governanceDecisions: 3,
    replayFailures: 0,
    sandboxVerified: true,
    runtimeInstability: false,
    executedAt: 0,
    ...overrides,
  };
}

function createMockBatchReport(overrides: Partial<ExecutionBatchReport> = {}): ExecutionBatchReport {
  return {
    batchId: 'batch-1',
    config: {
      corpusPath: '/test/corpus',
      iterations: 2,
      batchSize: 5,
      reportOnly: false,
    },
    totalRepositories: 2,
    completedRepositories: 2,
    failedRepositories: 0,
    results: [
      createMockResult({ repoPath: '/test/repo-a', executionId: 'exec-1', iteration: 1 }),
      createMockResult({ repoPath: '/test/repo-b', executionId: 'exec-2', iteration: 1 }),
      createMockResult({ repoPath: '/test/repo-a', executionId: 'exec-3', iteration: 2 }),
      createMockResult({ repoPath: '/test/repo-b', executionId: 'exec-4', iteration: 2 }),
    ],
    startedAt: 0,
    completedAt: 0,
    durationMs: 0,
    ...overrides,
  };
}

describe('ExecutionScheduler', () => {
  it('discovers repositories from corpus path', () => {
    const scheduler = new ExecutionScheduler();
    const repos = (scheduler as any).discoverRepositories('/nonexistent/path');
    expect(repos).toEqual([]);
  });

  it('creates batches from repository list', () => {
    const scheduler = new ExecutionScheduler();
    const items = [1, 2, 3, 4, 5];
    const batches = (scheduler as any).createBatches(items, 2);
    expect(batches).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('creates single batch when batchSize >= items', () => {
    const scheduler = new ExecutionScheduler();
    const items = [1, 2, 3];
    const batches = (scheduler as any).createBatches(items, 10);
    expect(batches).toEqual([[1, 2, 3]]);
  });

  it('filters repositories by subset pattern', () => {
    const scheduler = new ExecutionScheduler();
    const repos = (scheduler as any).discoverRepositories('/nonexistent/path', 'pattern');
    expect(repos).toEqual([]);
  });
});

describe('EvidenceCollector', () => {
  it('collects evidence from successful execution', () => {
    const collector = new EvidenceCollector();
    const batchReport = createMockBatchReport();
    const collection = collector.collect(batchReport);

    expect(collection.batchId).toBe('batch-1');
    expect(collection.totalCount).toBeGreaterThanOrEqual(0);
    expect(collection.records).toBeDefined();
  });

  it('collects healing artifact evidence', () => {
    const collector = new EvidenceCollector();
    const batchReport = createMockBatchReport({
      results: [
        createMockResult({
          repoPath: '/test/repo',
          report: {
            executionId: 'exec-1',
            repoPath: '/test/repo',
            frameworkType: 'playwright',
            compatibilityStatus: 'supported',
            repositorySummary: { totalFiles: 10, totalLocators: 20, compatibilityScore: 0.8, risks: 1 },
            healingSummary: { totalAttempts: 3, successfulHealings: 2, reviewPackages: 1 },
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
          },
        }),
      ],
    });

    const collection = collector.collect(batchReport);
    const healingEvidence = collector.filterByType(collection, 'healing-artifact');
    expect(healingEvidence.length).toBeGreaterThan(0);
  });

  it('collects replay divergence evidence', () => {
    const collector = new EvidenceCollector();
    const batchReport = createMockBatchReport({
      results: [
        createMockResult({
          repoPath: '/test/repo',
          report: {
            executionId: 'exec-1',
            repoPath: '/test/repo',
            frameworkType: 'playwright',
            compatibilityStatus: 'supported',
            repositorySummary: { totalFiles: 10, totalLocators: 20, compatibilityScore: 0.8, risks: 1 },
            healingSummary: { totalAttempts: 0, successfulHealings: 0, reviewPackages: 0 },
            validationOutcomes: { totalValidations: 5, passed: 4, failed: 1 },
            replayStability: { domStabilized: false, replayDeterministic: false, driftSeverity: 'high' },
            governanceDecisions: { governancePassed: true, gatesPassed: 3, gatesFailed: 0 },
            sandboxVerification: { sandboxExecuted: true, compileSuccess: true, isolationVerified: true },
            patchProposals: { totalProposals: 0, status: 'none' },
            rollbackMetadata: { rollbackAvailable: false },
            riskAnalysis: { overallRisk: 'low', riskFactors: [] },
            runtimeMetrics: {
              domStabilizationSuccessRate: 0,
              replayRecoverySuccess: 0,
              staleRecoverySuccess: 0,
              iframeRecoveryRate: 0,
              asyncRenderInstabilityFrequency: 1,
              replayDriftFrequency: 1,
            },
            stateTransitions: { transitions: [], currentState: 'completed', finalState: 'completed', totalTransitions: 5, failedTransitions: 0 },
            failureBoundary: { events: [], totalFailures: 0, recoverableFailures: 0, unrecoverableFailures: 0, gracefulDegradation: true },
            persistedPaths: [],
            completedAt: 0,
          },
          replayFailures: 1,
          runtimeInstability: true,
        }),
      ],
    });

    const collection = collector.collect(batchReport);
    const replayEvidence = collector.filterByType(collection, 'replay-divergence');
    expect(replayEvidence.length).toBeGreaterThan(0);
  });

  it('collects governance rejection evidence', () => {
    const collector = new EvidenceCollector();
    const batchReport = createMockBatchReport({
      results: [
        createMockResult({
          repoPath: '/test/repo',
          report: {
            executionId: 'exec-1',
            repoPath: '/test/repo',
            frameworkType: 'playwright',
            compatibilityStatus: 'supported',
            repositorySummary: { totalFiles: 10, totalLocators: 20, compatibilityScore: 0.8, risks: 1 },
            healingSummary: { totalAttempts: 0, successfulHealings: 0, reviewPackages: 0 },
            validationOutcomes: { totalValidations: 5, passed: 4, failed: 1 },
            replayStability: { domStabilized: true, replayDeterministic: true, driftSeverity: 'none' },
            governanceDecisions: { governancePassed: false, gatesPassed: 2, gatesFailed: 1 },
            sandboxVerification: { sandboxExecuted: true, compileSuccess: true, isolationVerified: true },
            patchProposals: { totalProposals: 0, status: 'none' },
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
          },
        }),
      ],
    });

    const collection = collector.collect(batchReport);
    const governanceEvidence = collector.filterByType(collection, 'governance-rejection');
    expect(governanceEvidence.length).toBeGreaterThan(0);
  });

  it('filters evidence by severity', () => {
    const collector = new EvidenceCollector();
    const batchReport = createMockBatchReport();
    const collection = collector.collect(batchReport);

    const highSeverity = collector.filterBySeverity(collection, 'high');
    expect(Array.isArray(highSeverity)).toBe(true);
  });

  it('filters evidence by repository', () => {
    const collector = new EvidenceCollector();
    const batchReport = createMockBatchReport();
    const collection = collector.collect(batchReport);

    const repoEvidence = collector.filterByRepo(collection, '/test/repo-a');
    expect(Array.isArray(repoEvidence)).toBe(true);
  });
});

describe('FailureClusterAnalyzer', () => {
  it('analyzes evidence collection and generates cluster report', () => {
    const analyzer = new FailureClusterAnalyzer();
    const collection: EvidenceCollection = {
      batchId: 'batch-1',
      records: [],
      totalCount: 0,
      collectedAt: 0,
    };

    const report = analyzer.analyze(collection, 'batch-1');
    expect(report.batchId).toBe('batch-1');
    expect(report.totalClusters).toBe(0);
    expect(report.totalFailures).toBe(0);
    expect(report.mostSevereCluster).toBeNull();
  });

  it('identifies replay instability clusters', () => {
    const analyzer = new FailureClusterAnalyzer();
    const collection: EvidenceCollection = {
      batchId: 'batch-1',
      records: [
        {
          evidenceId: 'evidence-1',
          type: 'replay-divergence',
          repoPath: '/test/repo',
          executionId: 'exec-1',
          iteration: 1,
          description: 'Replay divergence detected',
          severity: 'high',
          metadata: {},
          collectedAt: 0,
        },
      ],
      totalCount: 1,
      collectedAt: 0,
    };

    const report = analyzer.analyze(collection, 'batch-1');
    expect(report.totalClusters).toBeGreaterThan(0);
    const replayCluster = report.clusters.find((c) => c.type === 'replay-instability');
    expect(replayCluster).toBeDefined();
  });

  it('identifies governance blind spot clusters', () => {
    const analyzer = new FailureClusterAnalyzer();
    const collection: EvidenceCollection = {
      batchId: 'batch-1',
      records: [
        {
          evidenceId: 'evidence-1',
          type: 'governance-rejection',
          repoPath: '/test/repo',
          executionId: 'exec-1',
          iteration: 1,
          description: 'Governance rejection',
          severity: 'high',
          metadata: {},
          collectedAt: 0,
        },
      ],
      totalCount: 1,
      collectedAt: 0,
    };

    const report = analyzer.analyze(collection, 'batch-1');
    const governanceCluster = report.clusters.find((c) => c.type === 'governance-blind-spot');
    expect(governanceCluster).toBeDefined();
  });

  it('computes severity correctly', () => {
    const analyzer = new FailureClusterAnalyzer();
    const collection: EvidenceCollection = {
      batchId: 'batch-1',
      records: [
        {
          evidenceId: 'evidence-1',
          type: 'replay-divergence',
          repoPath: '/test/repo',
          executionId: 'exec-1',
          iteration: 1,
          description: 'Replay divergence',
          severity: 'critical',
          metadata: {},
          collectedAt: 0,
        },
      ],
      totalCount: 1,
      collectedAt: 0,
    };

    const report = analyzer.analyze(collection, 'batch-1');
    expect(report.mostSevereCluster?.severity).toBe('critical');
  });
});

describe('ReliabilityTrendAnalyzer', () => {
  it('analyzes batch report and generates trend report', () => {
    const analyzer = new ReliabilityTrendAnalyzer();
    const batchReport = createMockBatchReport();

    const report = analyzer.analyze(batchReport);
    expect(report.batchId).toBe('batch-1');
    expect(report.trends.length).toBe(5);
    expect(report.healingTrend).toBeDefined();
    expect(report.replayStabilityTrend).toBeDefined();
    expect(report.governanceConsistencyTrend).toBeDefined();
    expect(report.runtimeReliabilityTrend).toBeDefined();
    expect(report.patchSurvivabilityTrend).toBeDefined();
  });

  it('computes healing trend correctly', () => {
    const analyzer = new ReliabilityTrendAnalyzer();
    const batchReport = createMockBatchReport({
      results: [
        createMockResult({ iteration: 1, healingAttempts: 4, successfulHealings: 2 }),
        createMockResult({ iteration: 1, healingAttempts: 4, successfulHealings: 2 }),
        createMockResult({ iteration: 2, healingAttempts: 4, successfulHealings: 3 }),
        createMockResult({ iteration: 2, healingAttempts: 4, successfulHealings: 3 }),
      ],
    });

    const report = analyzer.analyze(batchReport);
    expect(report.healingTrend.values).toEqual([0.5, 0.75]);
    expect(report.healingTrend.direction).toBe('improving');
  });

  it('computes replay stability trend correctly', () => {
    const analyzer = new ReliabilityTrendAnalyzer();
    const batchReport = createMockBatchReport({
      results: [
        createMockResult({ iteration: 1, replayFailures: 0 }),
        createMockResult({ iteration: 1, replayFailures: 1 }),
        createMockResult({ iteration: 2, replayFailures: 0 }),
        createMockResult({ iteration: 2, replayFailures: 0 }),
      ],
    });

    const report = analyzer.analyze(batchReport);
    expect(report.replayStabilityTrend.values).toEqual([0.5, 1]);
  });

  it('returns insufficient-data for single iteration', () => {
    const analyzer = new ReliabilityTrendAnalyzer();
    const batchReport = createMockBatchReport({
      results: [
        createMockResult({ iteration: 1 }),
        createMockResult({ iteration: 1 }),
      ],
      config: { corpusPath: '/test', iterations: 1, batchSize: 5, reportOnly: false },
    });

    const report = analyzer.analyze(batchReport);
    expect(report.healingTrend.direction).toBe('insufficient-data');
  });

  it('computes overall trend correctly', () => {
    const analyzer = new ReliabilityTrendAnalyzer();
    const batchReport = createMockBatchReport({
      results: [
        createMockResult({ iteration: 1, healingAttempts: 4, successfulHealings: 2, replayFailures: 1, runtimeInstability: true }),
        createMockResult({ iteration: 1, healingAttempts: 4, successfulHealings: 2, replayFailures: 1, runtimeInstability: true }),
        createMockResult({ iteration: 2, healingAttempts: 4, successfulHealings: 3, replayFailures: 0, runtimeInstability: false }),
        createMockResult({ iteration: 2, healingAttempts: 4, successfulHealings: 3, replayFailures: 0, runtimeInstability: false }),
      ],
    });

    const report = analyzer.analyze(batchReport);
    expect(['improving', 'stable', 'degrading']).toContain(report.overallTrend);
  });
});

describe('UnsupportedPatternDetector', () => {
  it('detects unsupported patterns from batch report', () => {
    const detector = new UnsupportedPatternDetector();
    const batchReport = createMockBatchReport();

    const inventory = detector.detect(batchReport);
    expect(inventory.batchId).toBe('batch-1');
    expect(inventory.totalPatterns).toBeDefined();
    expect(inventory.byType).toBeDefined();
  });

  it('detects dynamic selector factory patterns', () => {
    const detector = new UnsupportedPatternDetector();
    const batchReport = createMockBatchReport({
      results: [
        createMockResult({
          repoPath: '/test/repo',
          report: {
            executionId: 'exec-1',
            repoPath: '/test/repo',
            frameworkType: 'playwright',
            compatibilityStatus: 'supported',
            repositorySummary: { totalFiles: 10, totalLocators: 20, compatibilityScore: 0.8, risks: 1 },
            healingSummary: { totalAttempts: 5, successfulHealings: 0, reviewPackages: 0 },
            validationOutcomes: { totalValidations: 5, passed: 4, failed: 1 },
            replayStability: { domStabilized: true, replayDeterministic: true, driftSeverity: 'none' },
            governanceDecisions: { governancePassed: true, gatesPassed: 3, gatesFailed: 0 },
            sandboxVerification: { sandboxExecuted: true, compileSuccess: true, isolationVerified: true },
            patchProposals: { totalProposals: 0, status: 'none' },
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
          },
        }),
      ],
    });

    const inventory = detector.detect(batchReport);
    const dynamicSelectorPatterns = inventory.patterns.filter((p) => p.type === 'dynamic-selector-factory');
    expect(dynamicSelectorPatterns.length).toBeGreaterThan(0);
  });

  it('detects unstable async flow patterns', () => {
    const detector = new UnsupportedPatternDetector();
    const batchReport = createMockBatchReport({
      results: [
        createMockResult({
          repoPath: '/test/repo',
          runtimeInstability: true,
        }),
      ],
    });

    const inventory = detector.detect(batchReport);
    const asyncFlowPatterns = inventory.patterns.filter((p) => p.type === 'unstable-async-flow');
    expect(asyncFlowPatterns.length).toBeGreaterThan(0);
  });

  it('detects framework unsupported API patterns', () => {
    const detector = new UnsupportedPatternDetector();
    const batchReport = createMockBatchReport({
      results: [
        createMockResult({
          repoPath: '/test/repo',
          report: {
            executionId: 'exec-1',
            repoPath: '/test/repo',
            frameworkType: 'unknown',
            compatibilityStatus: 'unsupported',
            repositorySummary: { totalFiles: 10, totalLocators: 20, compatibilityScore: 0.8, risks: 1 },
            healingSummary: { totalAttempts: 0, successfulHealings: 0, reviewPackages: 0 },
            validationOutcomes: { totalValidations: 5, passed: 4, failed: 1 },
            replayStability: { domStabilized: true, replayDeterministic: true, driftSeverity: 'none' },
            governanceDecisions: { governancePassed: true, gatesPassed: 3, gatesFailed: 0 },
            sandboxVerification: { sandboxExecuted: true, compileSuccess: true, isolationVerified: true },
            patchProposals: { totalProposals: 0, status: 'none' },
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
          },
        }),
      ],
    });

    const inventory = detector.detect(batchReport);
    const unsupportedApiPatterns = inventory.patterns.filter((p) => p.type === 'framework-unsupported-api');
    expect(unsupportedApiPatterns.length).toBeGreaterThan(0);
  });
});

describe('OperationalInsights', () => {
  it('generates operational insights report', () => {
    const insights = new OperationalInsights();
    const evidenceCollection: EvidenceCollection = {
      batchId: 'batch-1',
      records: [],
      totalCount: 0,
      collectedAt: 0,
    };
    const clusterReport = {
      batchId: 'batch-1',
      clusters: [],
      totalClusters: 0,
      totalFailures: 0,
      mostSevereCluster: null,
      generatedAt: 0,
    };
    const trendReport = {
      batchId: 'batch-1',
      trends: [],
      healingTrend: { metric: 'healing', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      replayStabilityTrend: { metric: 'replay', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      governanceConsistencyTrend: { metric: 'governance', direction: 'stable', values: [1, 1], changePercent: 0 },
      runtimeReliabilityTrend: { metric: 'runtime', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      patchSurvivabilityTrend: { metric: 'patch', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      overallTrend: 'stable',
      generatedAt: 0,
    };
    const patternInventory = {
      batchId: 'batch-1',
      patterns: [],
      totalPatterns: 0,
      byType: {
        'wrapper-heavy-abstraction': 0,
        'dynamic-selector-factory': 0,
        'unstable-async-flow': 0,
        'framework-unsupported-api': 0,
        'deep-iframe-modal-nesting': 0,
      },
      generatedAt: 0,
    };

    const report = insights.generate(evidenceCollection, clusterReport, trendReport, patternInventory, 'batch-1');
    expect(report.batchId).toBe('batch-1');
    expect(report.totalInsights).toBeDefined();
    expect(report.criticalInsights).toBeDefined();
    expect(report.highInsights).toBeDefined();
  });

  it('detects unstable architecture patterns', () => {
    const insights = new OperationalInsights();
    const evidenceCollection: EvidenceCollection = {
      batchId: 'batch-1',
      records: [
        {
          evidenceId: 'evidence-1',
          type: 'unsupported-structure',
          repoPath: '/test/repo',
          executionId: 'exec-1',
          iteration: 1,
          description: 'Wrapper-heavy abstraction',
          severity: 'high',
          metadata: {},
          collectedAt: 0,
        },
      ],
      totalCount: 1,
      collectedAt: 0,
    };
    const clusterReport = {
      batchId: 'batch-1',
      clusters: [],
      totalClusters: 0,
      totalFailures: 0,
      mostSevereCluster: null,
      generatedAt: 0,
    };
    const trendReport = {
      batchId: 'batch-1',
      trends: [],
      healingTrend: { metric: 'healing', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      replayStabilityTrend: { metric: 'replay', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      governanceConsistencyTrend: { metric: 'governance', direction: 'stable', values: [1, 1], changePercent: 0 },
      runtimeReliabilityTrend: { metric: 'runtime', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      patchSurvivabilityTrend: { metric: 'patch', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      overallTrend: 'stable',
      generatedAt: 0,
    };
    const patternInventory = {
      batchId: 'batch-1',
      patterns: [
        {
          patternId: 'pattern-1',
          type: 'wrapper-heavy-abstraction',
          description: 'Wrapper-heavy abstraction',
          repoPath: '/test/repo',
          affectedFiles: ['/test/repo'],
          frequency: 1,
          severity: 'high',
          example: 'Wrapper-heavy abstraction detected',
        },
      ],
      totalPatterns: 1,
      byType: {
        'wrapper-heavy-abstraction': 1,
        'dynamic-selector-factory': 0,
        'unstable-async-flow': 0,
        'framework-unsupported-api': 0,
        'deep-iframe-modal-nesting': 0,
      },
      generatedAt: 0,
    };

    const report = insights.generate(evidenceCollection, clusterReport, trendReport, patternInventory, 'batch-1');
    const architectureInsights = report.insights.filter((i) => i.type === 'unstable-architecture-pattern');
    expect(architectureInsights.length).toBeGreaterThan(0);
  });

  it('detects replay instability hotspots when degrading', () => {
    const insights = new OperationalInsights();
    const evidenceCollection: EvidenceCollection = {
      batchId: 'batch-1',
      records: [
        {
          evidenceId: 'evidence-1',
          type: 'replay-divergence',
          repoPath: '/test/repo',
          executionId: 'exec-1',
          iteration: 1,
          description: 'Replay divergence',
          severity: 'high',
          metadata: {},
          collectedAt: 0,
        },
      ],
      totalCount: 1,
      collectedAt: 0,
    };
    const clusterReport = {
      batchId: 'batch-1',
      clusters: [],
      totalClusters: 0,
      totalFailures: 0,
      mostSevereCluster: null,
      generatedAt: 0,
    };
    const trendReport = {
      batchId: 'batch-1',
      trends: [],
      healingTrend: { metric: 'healing', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      replayStabilityTrend: { metric: 'replay', direction: 'degrading', values: [0.8, 0.5], changePercent: -37.5 },
      governanceConsistencyTrend: { metric: 'governance', direction: 'stable', values: [1, 1], changePercent: 0 },
      runtimeReliabilityTrend: { metric: 'runtime', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      patchSurvivabilityTrend: { metric: 'patch', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      overallTrend: 'degrading',
      generatedAt: 0,
    };
    const patternInventory = {
      batchId: 'batch-1',
      patterns: [],
      totalPatterns: 0,
      byType: {
        'wrapper-heavy-abstraction': 0,
        'dynamic-selector-factory': 0,
        'unstable-async-flow': 0,
        'framework-unsupported-api': 0,
        'deep-iframe-modal-nesting': 0,
      },
      generatedAt: 0,
    };

    const report = insights.generate(evidenceCollection, clusterReport, trendReport, patternInventory, 'batch-1');
    const replayInsights = report.insights.filter((i) => i.type === 'replay-instability-hotspot');
    expect(replayInsights.length).toBeGreaterThan(0);
    expect(replayInsights[0].severity).toBe('high');
  });

  it('detects runtime fragility zones when degrading', () => {
    const insights = new OperationalInsights();
    const evidenceCollection: EvidenceCollection = {
      batchId: 'batch-1',
      records: [
        {
          evidenceId: 'evidence-1',
          type: 'runtime-instability',
          repoPath: '/test/repo',
          executionId: 'exec-1',
          iteration: 1,
          description: 'Runtime instability',
          severity: 'high',
          metadata: {},
          collectedAt: 0,
        },
      ],
      totalCount: 1,
      collectedAt: 0,
    };
    const clusterReport = {
      batchId: 'batch-1',
      clusters: [],
      totalClusters: 0,
      totalFailures: 0,
      mostSevereCluster: null,
      generatedAt: 0,
    };
    const trendReport = {
      batchId: 'batch-1',
      trends: [],
      healingTrend: { metric: 'healing', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      replayStabilityTrend: { metric: 'replay', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      governanceConsistencyTrend: { metric: 'governance', direction: 'stable', values: [1, 1], changePercent: 0 },
      runtimeReliabilityTrend: { metric: 'runtime', direction: 'degrading', values: [0.8, 0.5], changePercent: -37.5 },
      patchSurvivabilityTrend: { metric: 'patch', direction: 'stable', values: [0.5, 0.5], changePercent: 0 },
      overallTrend: 'degrading',
      generatedAt: 0,
    };
    const patternInventory = {
      batchId: 'batch-1',
      patterns: [],
      totalPatterns: 0,
      byType: {
        'wrapper-heavy-abstraction': 0,
        'dynamic-selector-factory': 0,
        'unstable-async-flow': 0,
        'framework-unsupported-api': 0,
        'deep-iframe-modal-nesting': 0,
      },
      generatedAt: 0,
    };

    const report = insights.generate(evidenceCollection, clusterReport, trendReport, patternInventory, 'batch-1');
    const fragilityInsights = report.insights.filter((i) => i.type === 'runtime-fragility-zone');
    expect(fragilityInsights.length).toBeGreaterThan(0);
    expect(fragilityInsights[0].severity).toBe('high');
  });
});

describe('Deterministic Execution Scheduling', () => {
  it('produces deterministic ordering for same input', () => {
    const scheduler = new ExecutionScheduler();
    const items = [3, 1, 4, 1, 5, 9, 2, 6];
    const batches1 = (scheduler as any).createBatches(items, 3);
    const batches2 = (scheduler as any).createBatches(items, 3);

    expect(batches1).toEqual(batches2);
  });

  it('handles empty repository list', () => {
    const scheduler = new ExecutionScheduler();
    const batches = (scheduler as any).createBatches([], 5);
    expect(batches).toEqual([]);
  });
});

describe('Repeated Execution Consistency', () => {
  it('produces consistent evidence collection for same batch', () => {
    const collector = new EvidenceCollector();
    const batchReport = createMockBatchReport();

    const collection1 = collector.collect(batchReport);
    const collection2 = collector.collect(batchReport);

    expect(collection1.totalCount).toBe(collection2.totalCount);
    expect(collection1.batchId).toBe(collection2.batchId);
  });

  it('produces consistent cluster analysis for same evidence', () => {
    const analyzer = new FailureClusterAnalyzer();
    const collection: EvidenceCollection = {
      batchId: 'batch-1',
      records: [
        {
          evidenceId: 'evidence-1',
          type: 'replay-divergence',
          repoPath: '/test/repo',
          executionId: 'exec-1',
          iteration: 1,
          description: 'Replay divergence',
          severity: 'high',
          metadata: {},
          collectedAt: 0,
        },
      ],
      totalCount: 1,
      collectedAt: 0,
    };

    const report1 = analyzer.analyze(collection, 'batch-1');
    const report2 = analyzer.analyze(collection, 'batch-1');

    expect(report1.totalClusters).toBe(report2.totalClusters);
    expect(report1.totalFailures).toBe(report2.totalFailures);
  });
});
