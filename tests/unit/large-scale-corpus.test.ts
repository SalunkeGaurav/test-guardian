import { describe, it, expect } from 'vitest';
import { CorpusDiscovery } from '../../src/core/large-scale-corpus/corpus-discovery.js';
import { ExecutionStateManager } from '../../src/core/large-scale-corpus/execution-state-manager.js';
import { CrossRepositoryAggregator } from '../../src/core/large-scale-corpus/cross-repository-aggregator.js';
import type { RepositoryExecutionResult } from '../../src/core/large-scale-corpus/types.js';

describe('CorpusDiscovery', () => {
  it('discovers repositories recursively', () => {
    const discovery = new CorpusDiscovery();
    const inventory = discovery.discover('/nonexistent/path');

    expect(inventory.inventoryId).toBeDefined();
    expect(inventory.totalRepositories).toBe(0);
    expect(inventory.repositories).toEqual([]);
    expect(inventory.categories).toEqual([]);
    expect(inventory.generatedAt).toBe(0);
  });

  it('ignores node_modules and other ignored directories', () => {
    const discovery = new CorpusDiscovery();
    const inventory = discovery.discover('/nonexistent/path');

    expect(inventory.repositories.every((r) => !r.path.includes('node_modules'))).toBe(true);
    expect(inventory.repositories.every((r) => !r.path.includes('dist'))).toBe(true);
    expect(inventory.repositories.every((r) => !r.path.includes('build'))).toBe(true);
  });

  it('produces deterministic output for same input', () => {
    const discovery = new CorpusDiscovery();
    const inventory1 = discovery.discover('/nonexistent/path');
    const inventory2 = discovery.discover('/nonexistent/path');

    expect(inventory1.totalRepositories).toBe(inventory2.totalRepositories);
    expect(inventory1.repositories.length).toBe(inventory2.repositories.length);
  });
});

describe('ExecutionStateManager', () => {
  it('initializes execution state deterministically', () => {
    const manager = new ExecutionStateManager('/test/project');
    const state = manager.initialize('/test/corpus', 5, ['/repo/a', '/repo/b', '/repo/c']);

    expect(state.stateId).toBeDefined();
    expect(state.corpusPath).toBe('/test/corpus');
    expect(state.batchSize).toBe(5);
    expect(state.repositories.length).toBe(3);
    expect(state.repositories.every((r) => r.status === 'pending')).toBe(true);
    expect(state.totalRepositories).toBe(3);
    expect(state.completedRepositories).toBe(0);
    expect(state.failedRepositories).toBe(0);
  });

  it('creates stable batches', () => {
    const manager = new ExecutionStateManager('/test/project');
    const batches = manager.createBatches(['/a', '/b', '/c', '/d', '/e'], 2);

    expect(batches.length).toBe(3);
    expect(batches[0]).toEqual(['/a', '/b']);
    expect(batches[1]).toEqual(['/c', '/d']);
    expect(batches[2]).toEqual(['/e']);
  });

  it('creates single batch when batchSize >= repos', () => {
    const manager = new ExecutionStateManager('/test/project');
    const batches = manager.createBatches(['/a', '/b'], 5);

    expect(batches.length).toBe(1);
    expect(batches[0]).toEqual(['/a', '/b']);
  });

  it('handles empty repository list', () => {
    const manager = new ExecutionStateManager('/test/project');
    const batches = manager.createBatches([], 5);

    expect(batches.length).toBe(0);
  });

  it('updates repository state correctly', () => {
    const manager = new ExecutionStateManager('/test/project');
    manager.initialize('/test/corpus', 5, ['/repo/a', '/repo/b']);

    const state = manager.updateRepository('/repo/a', 'completed');
    expect(state).not.toBeNull();
    expect(state!.completedRepositories).toBe(1);
    expect(state!.failedRepositories).toBe(0);
  });

  it('tracks failed repositories', () => {
    const manager = new ExecutionStateManager('/test/project');
    manager.initialize('/test/corpus', 5, ['/repo/a', '/repo/b']);

    manager.updateRepository('/repo/a', 'failed', 'test error');
    const state = manager.updateRepository('/repo/b', 'failed', 'another error');

    expect(state!.failedRepositories).toBe(2);
  });

  it('returns pending repositories correctly', () => {
    const manager = new ExecutionStateManager('/test/project');
    manager.initialize('/test/corpus', 5, ['/repo/a', '/repo/b', '/repo/c']);

    manager.updateRepository('/repo/a', 'completed');
    const pending = manager.getPendingRepositories();

    expect(pending).toEqual(['/repo/b', '/repo/c']);
  });

  it('returns failed repositories correctly', () => {
    const manager = new ExecutionStateManager('/test/project');
    manager.initialize('/test/corpus', 5, ['/repo/a', '/repo/b']);

    manager.updateRepository('/repo/a', 'failed', 'error');
    const failed = manager.getFailedRepositories();

    expect(failed).toEqual(['/repo/a']);
  });

  it('determines repositories to run for resume mode', () => {
    const manager = new ExecutionStateManager('/test/project');
    manager.initialize('/test/corpus', 5, ['/repo/a', '/repo/b', '/repo/c']);

    manager.updateRepository('/repo/a', 'completed');
    manager.updateRepository('/repo/b', 'failed', 'error');

    const toRun = manager.getRepositoriesToRun(true, false);
    expect(toRun).toContain('/repo/b');
    expect(toRun).toContain('/repo/c');
    expect(toRun).not.toContain('/repo/a');
  });

  it('determines repositories to run for failed-only mode', () => {
    const manager = new ExecutionStateManager('/test/project');
    manager.initialize('/test/corpus', 5, ['/repo/a', '/repo/b', '/repo/c']);

    manager.updateRepository('/repo/a', 'completed');
    manager.updateRepository('/repo/b', 'failed', 'error');
    manager.updateRepository('/repo/c', 'completed');

    const toRun = manager.getRepositoriesToRun(false, true);
    expect(toRun).toEqual(['/repo/b']);
  });

  it('returns empty list when no state exists', () => {
    const manager = new ExecutionStateManager('/test/nonexistent');
    const toRun = manager.getRepositoriesToRun(false, false);

    expect(toRun).toEqual([]);
  });
});

describe('CrossRepositoryAggregator', () => {
  function createMockResult(overrides: Partial<RepositoryExecutionResult> = {}): RepositoryExecutionResult {
    return {
      repoPath: '/test/repo',
      name: 'repo',
      category: 'root',
      status: 'completed',
      compatibilityStatus: 'supported',
      parserSurvivability: 1,
      compileStability: 0.9,
      healingRecoveryRate: 0.8,
      governanceRejectionRate: 0,
      replayInstability: false,
      unsupportedPatterns: [],
      executionDurationMs: 100,
      completedAt: 0,
      ...overrides,
    };
  }

  it('aggregates results deterministically', () => {
    const aggregator = new CrossRepositoryAggregator();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', name: 'a', compatibilityStatus: 'supported' }),
      createMockResult({ repoPath: '/repo/b', name: 'b', compatibilityStatus: 'partially-supported' }),
      createMockResult({ repoPath: '/repo/c', name: 'c', compatibilityStatus: 'unsupported' }),
    ];

    const aggregation = aggregator.aggregate('/test/corpus', results);

    expect(aggregation.aggregationId).toBeDefined();
    expect(aggregation.totalRepositories).toBe(3);
    expect(aggregation.completedRepositories).toBe(3);
    expect(aggregation.failedRepositories).toBe(0);
    expect(aggregation.compatibilityDistribution.supported).toBe(1);
    expect(aggregation.compatibilityDistribution.partiallySupported).toBe(1);
    expect(aggregation.compatibilityDistribution.unsupported).toBe(1);
    expect(aggregation.generatedAt).toBe(0);
  });

  it('computes unsupported pattern frequency', () => {
    const aggregator = new CrossRepositoryAggregator();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', unsupportedPatterns: ['dynamic-selector', 'wrapper-heavy'] }),
      createMockResult({ repoPath: '/repo/b', unsupportedPatterns: ['dynamic-selector'] }),
      createMockResult({ repoPath: '/repo/c', unsupportedPatterns: ['wrapper-heavy'] }),
    ];

    const aggregation = aggregator.aggregate('/test/corpus', results);

    expect(aggregation.unsupportedPatternFrequency.length).toBe(2);
    expect(aggregation.unsupportedPatternFrequency[0].pattern).toBe('dynamic-selector');
    expect(aggregation.unsupportedPatternFrequency[0].frequency).toBe(2);
  });

  it('computes governance failure clusters', () => {
    const aggregator = new CrossRepositoryAggregator();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', governanceRejectionRate: 0.5 }),
      createMockResult({ repoPath: '/repo/b', governanceRejectionRate: 0.5 }),
      createMockResult({ repoPath: '/repo/c', governanceRejectionRate: 0 }),
    ];

    const aggregation = aggregator.aggregate('/test/corpus', results);

    expect(aggregation.governanceFailureClusters.length).toBe(1);
    expect(aggregation.governanceFailureClusters[0].count).toBe(2);
  });

  it('computes runtime instability clusters', () => {
    const aggregator = new CrossRepositoryAggregator();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', replayInstability: true }),
      createMockResult({ repoPath: '/repo/b', replayInstability: true }),
      createMockResult({ repoPath: '/repo/c', replayInstability: false }),
    ];

    const aggregation = aggregator.aggregate('/test/corpus', results);

    expect(aggregation.runtimeInstabilityClusters.length).toBe(1);
    expect(aggregation.runtimeInstabilityClusters[0].count).toBe(2);
  });

  it('computes performance bottlenecks', () => {
    const aggregator = new CrossRepositoryAggregator();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', executionDurationMs: 100 }),
      createMockResult({ repoPath: '/repo/b', executionDurationMs: 200 }),
      createMockResult({ repoPath: '/repo/c', executionDurationMs: 300 }),
    ];

    const aggregation = aggregator.aggregate('/test/corpus', results);

    expect(aggregation.performanceBottlenecks.length).toBeGreaterThan(0);
    expect(aggregation.performanceBottlenecks[0].avgDurationMs).toBe(200);
    expect(aggregation.performanceBottlenecks[0].maxDurationMs).toBe(300);
  });

  it('computes repository type correlation', () => {
    const aggregator = new CrossRepositoryAggregator();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', category: 'enterprise', compatibilityStatus: 'supported', parserSurvivability: 1, compileStability: 0.9 }),
      createMockResult({ repoPath: '/repo/b', category: 'enterprise', compatibilityStatus: 'supported', parserSurvivability: 0.8, compileStability: 0.7 }),
      createMockResult({ repoPath: '/repo/c', category: 'chaotic', compatibilityStatus: 'unsupported', parserSurvivability: 0.5, compileStability: 0.3 }),
    ];

    const aggregation = aggregator.aggregate('/test/corpus', results);

    expect(aggregation.repositoryTypeCorrelation.length).toBe(2);
    const enterprise = aggregation.repositoryTypeCorrelation.find((c) => c.category === 'enterprise');
    expect(enterprise).toBeDefined();
    expect(enterprise!.failureRate).toBe(0);
  });

  it('computes failure hotspots', () => {
    const aggregator = new CrossRepositoryAggregator();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', name: 'a', status: 'completed' }),
      createMockResult({ repoPath: '/repo/b', name: 'b', status: 'failed', error: 'incompatible framework' }),
    ];

    const aggregation = aggregator.aggregate('/test/corpus', results);

    expect(aggregation.failureHotspots.length).toBe(1);
    expect(aggregation.failureHotspots[0].repository).toBe('b');
    expect(aggregation.failureHotspots[0].severity).toBe('high');
  });

  it('computes recovery metrics', () => {
    const aggregator = new CrossRepositoryAggregator();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', parserSurvivability: 1, compileStability: 0.9, healingRecoveryRate: 0.8 }),
      createMockResult({ repoPath: '/repo/b', parserSurvivability: 0.8, compileStability: 0.7, healingRecoveryRate: 0.6 }),
    ];

    const aggregation = aggregator.aggregate('/test/corpus', results);

    expect(aggregation.recoveryMetrics.length).toBeGreaterThan(0);
    const parserMetric = aggregation.recoveryMetrics.find((m) => m.metric === 'parser-survivability');
    expect(parserMetric).toBeDefined();
    expect(parserMetric!.avgValue).toBe(0.9);
  });

  it('produces deterministic output for same input', () => {
    const aggregator = new CrossRepositoryAggregator();
    const results: RepositoryExecutionResult[] = [
      createMockResult({ repoPath: '/repo/a', compatibilityStatus: 'supported' }),
      createMockResult({ repoPath: '/repo/b', compatibilityStatus: 'unsupported' }),
    ];

    const aggregation1 = aggregator.aggregate('/test/corpus', results);
    const aggregation2 = aggregator.aggregate('/test/corpus', results);

    expect(aggregation1.compatibilityDistribution).toEqual(aggregation2.compatibilityDistribution);
    expect(aggregation1.totalRepositories).toBe(aggregation2.totalRepositories);
    expect(aggregation1.completedRepositories).toBe(aggregation2.completedRepositories);
  });

  it('handles empty results gracefully', () => {
    const aggregator = new CrossRepositoryAggregator();
    const aggregation = aggregator.aggregate('/test/corpus', []);

    expect(aggregation.totalRepositories).toBe(0);
    expect(aggregation.completedRepositories).toBe(0);
    expect(aggregation.failedRepositories).toBe(0);
    expect(aggregation.compatibilityDistribution.supported).toBe(0);
    expect(aggregation.recoveryMetrics).toEqual([]);
  });
});

describe('Failure Isolation', () => {
  it('continues aggregation even when some repos fail', () => {
    const aggregator = new CrossRepositoryAggregator();
    const results: RepositoryExecutionResult[] = [
      {
        repoPath: '/repo/a',
        name: 'a',
        category: 'root',
        status: 'completed',
        compatibilityStatus: 'supported',
        parserSurvivability: 1,
        compileStability: 0.9,
        healingRecoveryRate: 0.8,
        governanceRejectionRate: 0,
        replayInstability: false,
        unsupportedPatterns: [],
        executionDurationMs: 100,
        completedAt: 0,
      },
      {
        repoPath: '/repo/b',
        name: 'b',
        category: 'root',
        status: 'failed',
        error: 'framework incompatible',
        completedAt: 0,
      },
      {
        repoPath: '/repo/c',
        name: 'c',
        category: 'root',
        status: 'completed',
        compatibilityStatus: 'partially-supported',
        parserSurvivability: 0.5,
        compileStability: 0.6,
        healingRecoveryRate: 0.3,
        governanceRejectionRate: 0.2,
        replayInstability: true,
        unsupportedPatterns: ['dynamic-selector'],
        executionDurationMs: 200,
        completedAt: 0,
      },
    ];

    const aggregation = aggregator.aggregate('/test/corpus', results);

    expect(aggregation.totalRepositories).toBe(3);
    expect(aggregation.completedRepositories).toBe(2);
    expect(aggregation.failedRepositories).toBe(1);
    expect(aggregation.compatibilityDistribution.supported).toBe(1);
    expect(aggregation.compatibilityDistribution.partiallySupported).toBe(1);
    expect(aggregation.failureHotspots.length).toBe(1);
  });
});
