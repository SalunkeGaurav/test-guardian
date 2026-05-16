/**
 * Large Scale Corpus Execution
 *
 * Main orchestrator for large-scale corpus execution.
 * Recursively discovers repositories, executes them in batches,
 * aggregates cross-repository results, and generates operational reports.
 *
 * Reuses:
 * - CorpusDiscovery
 * - ExecutionStateManager
 * - RepositoryExecutionRunner
 * - CrossRepositoryAggregator
 * - RepositoryValidator
 * - UnifiedRuntime
 *
 * No Date.now(). No Math.random(). Deterministic only.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CorpusDiscovery } from './corpus-discovery.js';
import { ExecutionStateManager } from './execution-state-manager.js';
import { RepositoryExecutionRunner } from './repository-execution-runner.js';
import { CrossRepositoryAggregator } from './cross-repository-aggregator.js';
import type {
  LargeScaleCorpusReport,
  LargeScaleCorpusInput,
  RepositoryExecutionResult,
} from './types.js';

let reportCounter = 0;
function nextReportId(): string {
  reportCounter++;
  return `large-scale-corpus-${reportCounter}`;
}

export class LargeScaleCorpusExecution {
  private readonly corpusDiscovery: CorpusDiscovery;
  private readonly stateManager: ExecutionStateManager;
  private readonly executionRunner: RepositoryExecutionRunner;
  private readonly aggregator: CrossRepositoryAggregator;

  constructor(private readonly projectRoot: string) {
    this.corpusDiscovery = new CorpusDiscovery();
    this.stateManager = new ExecutionStateManager(projectRoot);
    this.executionRunner = new RepositoryExecutionRunner(projectRoot);
    this.aggregator = new CrossRepositoryAggregator();
  }

  async execute(input: LargeScaleCorpusInput): Promise<LargeScaleCorpusReport> {
    const { corpusPath, batchSize = 10, resume = false, failedOnly = false, reportOnly = false } = input;
    const reportId = nextReportId();

    // Step 1: Discover repositories
    const inventory = this.corpusDiscovery.discover(corpusPath);

    if (inventory.totalRepositories === 0) {
      return {
        reportId,
        corpusPath,
        inventory,
        executionState: this.stateManager.initialize(corpusPath, batchSize, []),
        results: [],
        aggregation: this.aggregator.aggregate(corpusPath, []),
        persistedPaths: [],
        generatedAt: 0,
      };
    }

    // Step 2: Determine which repositories to run
    const repoPathsToRun = this.determineRepositoriesToRun(inventory, resume, failedOnly);

    // Step 3: Initialize or resume execution state
    let executionState = this.stateManager.initialize(corpusPath, batchSize, inventory.repositories.map((r) => r.path));

    // Step 4: Create batches
    const batches = this.stateManager.createBatches(repoPathsToRun, batchSize);

    // Step 5: Execute batches
    const results: RepositoryExecutionResult[] = [];

    for (const batch of batches) {
      for (const repoPath of batch) {
        const result = await this.executionRunner.execute(repoPath, reportOnly);
        results.push(result);

        this.stateManager.updateRepository(
          repoPath,
          result.status === 'completed' ? 'completed' : 'failed',
          result.error,
        );
      }
    }

    // Step 6: Aggregate results
    const aggregation = this.aggregator.aggregate(corpusPath, results);

    // Step 7: Persist reports
    const persistedPaths = this.persistReports(reportId, inventory, executionState, results, aggregation);

    return {
      reportId,
      corpusPath,
      inventory,
      executionState,
      results,
      aggregation,
      persistedPaths,
      generatedAt: 0,
    };
  }

  private determineRepositoriesToRun(
    inventory: import('./types.js').RepositoryInventory,
    resume: boolean,
    failedOnly: boolean,
  ): string[] {
    if (failedOnly) {
      return this.stateManager.getFailedRepositories();
    }

    if (resume) {
      const existing = this.stateManager.loadState();
      if (existing) {
        return this.stateManager.getPendingRepositories().concat(this.stateManager.getFailedRepositories());
      }
    }

    return inventory.repositories.map((r) => r.path);
  }

  private persistReports(
    reportId: string,
    inventory: import('./types.js').RepositoryInventory,
    executionState: import('./types.js').ExecutionState,
    results: RepositoryExecutionResult[],
    aggregation: import('./types.js').CrossRepositoryAggregation,
  ): string[] {
    const paths: string[] = [];

    try {
      const outputDir = join(this.projectRoot, '.testguardian', 'large-scale-corpus');
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      // repository-index.json
      const indexPath = join(outputDir, 'repository-index.json');
      writeFileSync(
        indexPath,
        JSON.stringify(
          {
            inventoryId: inventory.inventoryId,
            corpusPath: inventory.corpusPath,
            totalRepositories: inventory.totalRepositories,
            categories: inventory.categories,
            repositories: inventory.repositories.map((r) => ({
              path: r.path,
              name: r.name,
              category: r.category,
              markers: r.markers,
            })),
          },
          null,
          2,
        ),
        'utf-8',
      );
      paths.push(indexPath);

      // execution-summary.json
      const summaryPath = join(outputDir, 'execution-summary.json');
      writeFileSync(
        summaryPath,
        JSON.stringify(
          {
            reportId,
            corpusPath: inventory.corpusPath,
            totalRepositories: inventory.totalRepositories,
            completedRepositories: results.filter((r) => r.status === 'completed').length,
            failedRepositories: results.filter((r) => r.status === 'failed').length,
            results: results.map((r) => ({
              repoPath: r.repoPath,
              name: r.name,
              category: r.category,
              status: r.status,
              compatibilityStatus: r.compatibilityStatus,
              error: r.error,
            })),
          },
          null,
          2,
        ),
        'utf-8',
      );
      paths.push(summaryPath);

      // compatibility-matrix.json
      const compatPath = join(outputDir, 'compatibility-matrix.json');
      writeFileSync(
        compatPath,
        JSON.stringify(aggregation.compatibilityDistribution, null, 2),
        'utf-8',
      );
      paths.push(compatPath);

      // instability-clusters.json
      const instabilityPath = join(outputDir, 'instability-clusters.json');
      writeFileSync(
        instabilityPath,
        JSON.stringify(
          {
            runtimeInstabilityClusters: aggregation.runtimeInstabilityClusters,
            unstableReplayStructures: aggregation.unstableReplayStructures,
          },
          null,
          2,
        ),
        'utf-8',
      );
      paths.push(instabilityPath);

      // unsupported-patterns.json
      const patternsPath = join(outputDir, 'unsupported-patterns.json');
      writeFileSync(
        patternsPath,
        JSON.stringify(aggregation.unsupportedPatternFrequency, null, 2),
        'utf-8',
      );
      paths.push(patternsPath);

      // governance-failures.json
      const governancePath = join(outputDir, 'governance-failures.json');
      writeFileSync(
        governancePath,
        JSON.stringify(aggregation.governanceFailureClusters, null, 2),
        'utf-8',
      );
      paths.push(governancePath);

      // performance-report.json
      const perfPath = join(outputDir, 'performance-report.json');
      writeFileSync(
        perfPath,
        JSON.stringify(aggregation.performanceBottlenecks, null, 2),
        'utf-8',
      );
      paths.push(perfPath);

      // failure-hotspots.json
      const hotspotsPath = join(outputDir, 'failure-hotspots.json');
      writeFileSync(
        hotspotsPath,
        JSON.stringify(aggregation.failureHotspots, null, 2),
        'utf-8',
      );
      paths.push(hotspotsPath);

      // recovery-metrics.json
      const recoveryPath = join(outputDir, 'recovery-metrics.json');
      writeFileSync(
        recoveryPath,
        JSON.stringify(aggregation.recoveryMetrics, null, 2),
        'utf-8',
      );
      paths.push(recoveryPath);
    } catch {
    }

    return paths;
  }
}
