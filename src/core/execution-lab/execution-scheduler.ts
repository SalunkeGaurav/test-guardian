/**
 * Execution Scheduler
 *
 * Supports deterministic repeated execution batches with:
 * - sequential runs
 * - iteration batches
 * - repository subsets
 * - retry-safe scheduling
 * - deterministic ordering
 *
 * Reuses: RepositoryRunner
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { RepositoryRunner } from './repository-runner.js';
import type { ExecutionBatchConfig, ExecutionBatchReport, RepositoryExecutionResult } from './types.js';

let batchCounter = 0;
function nextBatchId(): string {
  batchCounter++;
  return `batch-${batchCounter}`;
}

export class ExecutionScheduler {
  private readonly runner: RepositoryRunner;

  constructor() {
    this.runner = new RepositoryRunner();
  }

  async executeBatch(config: ExecutionBatchConfig): Promise<ExecutionBatchReport> {
    const batchId = nextBatchId();
    const startedAt = 0;
    const results: RepositoryExecutionResult[] = [];

    const repos = this.discoverRepositories(config.corpusPath, config.subsetPattern);

    for (let iteration = 0; iteration < config.iterations; iteration++) {
      const batch = this.createBatches(repos, config.batchSize);

      for (const repoBatch of batch) {
        for (const repoPath of repoBatch) {
          const result = await this.runner.run(repoPath, iteration + 1, config.reportOnly);
          results.push(result);
        }
      }
    }

    const completedAt = 0;
    const completedRepositories = results.filter((r) => r.success).length;
    const failedRepositories = results.filter((r) => !r.success).length;

    return {
      batchId,
      config,
      totalRepositories: repos.length,
      completedRepositories,
      failedRepositories,
      results,
      startedAt,
      completedAt,
      durationMs: 0,
    };
  }

  private discoverRepositories(corpusPath: string, subsetPattern?: string): string[] {
    if (!existsSync(corpusPath)) {
      return [];
    }

    const repos: string[] = [];

    if (statSync(corpusPath).isFile()) {
      return [corpusPath];
    }

    const entries = readdirSync(corpusPath).sort();
    for (const entry of entries) {
      const fullPath = join(corpusPath, entry);
      if (statSync(fullPath).isDirectory()) {
        if (subsetPattern && !entry.includes(subsetPattern)) {
          continue;
        }
        repos.push(fullPath);
      }
    }

    return repos.sort();
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}
