/**
 * Developer Workflow Storage
 *
 * Persists workflow simulation results to .testguardian/developer-workflows/
 * Uses atomic writes for corruption safety.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type {
  HealingReviewSession,
  ReviewErgonomicsReport,
  GovernanceVisibilityReport,
  ApprovalWorkflowBenchmark,
  ReviewPackage,
} from './types.js';

const ROOT_DIR = '.testguardian/developer-workflows';

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function atomicWrite(path: string, content: string): void {
  const tmp = path + '.tmp';
  writeFileSync(tmp, content, 'utf-8');
  renameSync(tmp, path);
}

function readJson<T>(path: string): T | null {
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export class DeveloperWorkflowStorage {
  private root: string;

  constructor(projectRoot: string = '.') {
    this.root = join(projectRoot, ROOT_DIR);
    ensureDir(this.root);
    ensureDir(join(this.root, 'sessions'));
    ensureDir(join(this.root, 'ergonomics'));
    ensureDir(join(this.root, 'visibility'));
    ensureDir(join(this.root, 'benchmark'));
    ensureDir(join(this.root, 'packages'));
  }

  saveSession(session: HealingReviewSession): void {
    const dir = join(this.root, 'sessions');
    const path = join(dir, `session-${session.id}.json`);
    atomicWrite(path, JSON.stringify(session, null, 2));
    this.updateLatestSession(session);
  }

  getLatestSession(): HealingReviewSession | null {
    const path = join(this.root, 'sessions', 'latest-session.json');
    return readJson<HealingReviewSession>(path);
  }

  listSessions(): HealingReviewSession[] {
    const dir = join(this.root, 'sessions');
    if (!existsSync(dir)) return [];

    const files = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'latest-session.json');
    const sessions: HealingReviewSession[] = [];

    for (const file of files) {
      const session = readJson<HealingReviewSession>(join(dir, file));
      if (session) sessions.push(session);
    }

    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  }

  saveErgonomicsReport(report: ReviewErgonomicsReport): void {
    const dir = join(this.root, 'ergonomics');
    const path = join(dir, `ergonomics-${report.id}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-ergonomics.json', report);
  }

  getLatestErgonomicsReport(): ReviewErgonomicsReport | null {
    const path = join(this.root, 'ergonomics', 'latest-ergonomics.json');
    return readJson<ReviewErgonomicsReport>(path);
  }

  saveVisibilityReport(report: GovernanceVisibilityReport): void {
    const dir = join(this.root, 'visibility');
    const path = join(dir, `visibility-${report.id}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-visibility.json', report);
  }

  getLatestVisibilityReport(): GovernanceVisibilityReport | null {
    const path = join(this.root, 'visibility', 'latest-visibility.json');
    return readJson<GovernanceVisibilityReport>(path);
  }

  saveBenchmark(benchmark: ApprovalWorkflowBenchmark): void {
    const dir = join(this.root, 'benchmark');
    const path = join(dir, `benchmark-${benchmark.id}.json`);
    atomicWrite(path, JSON.stringify(benchmark, null, 2));
    this.updateLatest(dir, 'latest-benchmark.json', benchmark);
  }

  getLatestBenchmark(): ApprovalWorkflowBenchmark | null {
    const path = join(this.root, 'benchmark', 'latest-benchmark.json');
    return readJson<ApprovalWorkflowBenchmark>(path);
  }

  saveReviewPackage(pkg: ReviewPackage): void {
    const dir = join(this.root, 'packages');
    const path = join(dir, `package-${pkg.id}.json`);
    atomicWrite(path, JSON.stringify(pkg, null, 2));
  }

  private updateLatestSession(session: HealingReviewSession): void {
    const path = join(this.root, 'sessions', 'latest-session.json');
    atomicWrite(path, JSON.stringify(session, null, 2));
  }

  private updateLatest(dir: string, filename: string, data: unknown): void {
    const path = join(dir, filename);
    atomicWrite(path, JSON.stringify(data, null, 2));
  }
}

function readdirSync(dir: string): string[] {
  try {
    const { readdirSync } = require('node:fs');
    return readdirSync(dir);
  } catch {
    return [];
  }
}