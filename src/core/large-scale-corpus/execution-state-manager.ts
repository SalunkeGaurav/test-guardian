/**
 * Execution State Manager
 *
 * Manages deterministic execution state with resume support.
 * Tracks repository execution status, enables skip completed,
 * and re-run failed repositories only.
 *
 * No Date.now(). No Math.random(). Deterministic only.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExecutionState, RepositoryExecutionState } from './types.js';

let stateCounter = 0;
function nextStateId(): string {
  stateCounter++;
  return `exec-state-${stateCounter}`;
}

export class ExecutionStateManager {
  constructor(private readonly projectRoot: string) {}

  private get stateDir(): string {
    return join(this.projectRoot, '.testguardian', 'large-scale-corpus');
  }

  private get stateFile(): string {
    return join(this.stateDir, 'execution-state.json');
  }

  initialize(corpusPath: string, batchSize: number, repoPaths: string[]): ExecutionState {
    const state: ExecutionState = {
      stateId: nextStateId(),
      corpusPath,
      batchSize,
      repositories: repoPaths.map((path) => ({
        repoPath: path,
        status: 'pending',
        attempts: 0,
      })),
      startedAt: 0,
      totalRepositories: repoPaths.length,
      completedRepositories: 0,
      failedRepositories: 0,
      skippedRepositories: 0,
    };

    this.persistState(state);
    return state;
  }

  loadState(): ExecutionState | null {
    if (!existsSync(this.stateFile)) return null;

    try {
      const content = readFileSync(this.stateFile, 'utf-8');
      return JSON.parse(content) as ExecutionState;
    } catch {
      return null;
    }
  }

  updateRepository(repoPath: string, status: RepositoryExecutionState['status'], error?: string): ExecutionState | null {
    const state = this.loadState();
    if (!state) return null;

    const repo = state.repositories.find((r) => r.repoPath === repoPath);
    if (!repo) return state;

    repo.status = status;
    repo.attempts++;
    if (error) repo.lastError = error;
    if (status === 'completed' || status === 'failed') {
      repo.completedAt = 0;
    }

    state.completedRepositories = state.repositories.filter((r) => r.status === 'completed').length;
    state.failedRepositories = state.repositories.filter((r) => r.status === 'failed').length;
    state.skippedRepositories = state.repositories.filter((r) => r.status === 'skipped').length;

    if (state.repositories.every((r) => r.status === 'completed' || r.status === 'failed' || r.status === 'skipped')) {
      state.completedAt = 0;
    }

    this.persistState(state);
    return state;
  }

  getPendingRepositories(): string[] {
    const state = this.loadState();
    if (!state) return [];

    return state.repositories
      .filter((r) => r.status === 'pending')
      .map((r) => r.repoPath);
  }

  getFailedRepositories(): string[] {
    const state = this.loadState();
    if (!state) return [];

    return state.repositories
      .filter((r) => r.status === 'failed')
      .map((r) => r.repoPath);
  }

  getCompletedRepositories(): string[] {
    const state = this.loadState();
    if (!state) return [];

    return state.repositories
      .filter((r) => r.status === 'completed')
      .map((r) => r.repoPath);
  }

  getRepositoriesToRun(resume: boolean, failedOnly: boolean): string[] {
    if (failedOnly) {
      return this.getFailedRepositories();
    }

    if (resume) {
      const existing = this.loadState();
      if (existing) {
        return this.getPendingRepositories().concat(this.getFailedRepositories());
      }
    }

    const state = this.loadState();
    if (state) {
      return state.repositories.map((r) => r.repoPath);
    }

    return [];
  }

  createBatches(repoPaths: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < repoPaths.length; i += batchSize) {
      batches.push(repoPaths.slice(i, i + batchSize));
    }
    return batches;
  }

  private persistState(state: ExecutionState): void {
    if (!existsSync(this.stateDir)) {
      mkdirSync(this.stateDir, { recursive: true });
    }
    writeFileSync(this.stateFile, JSON.stringify(state, null, 2), 'utf-8');
  }
}
