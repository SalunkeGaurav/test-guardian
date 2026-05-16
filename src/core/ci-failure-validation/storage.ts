/**
 * CI Failure Validation Storage
 *
 * Persists validation results to .testguardian/ci-failure-validation/
 * Uses atomic writes for corruption safety.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type {
  HistoricalFailure,
  FailureReplaySession,
  RealFailureClassificationReport,
  HistoricalHealingValidationReport,
  ReplayStabilityReport,
  TrustworthinessBenchmarkReport,
  RealWorldFailureInventory,
} from './types.js';

const ROOT_DIR = '.testguardian/ci-failure-validation';

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

export class CIFailureValidationStorage {
  private root: string;

  constructor(projectRoot: string = '.') {
    this.root = join(projectRoot, ROOT_DIR);
    ensureDir(this.root);
    ensureDir(join(this.root, 'failures'));
    ensureDir(join(this.root, 'replay-sessions'));
    ensureDir(join(this.root, 'classifications'));
    ensureDir(join(this.root, 'healing-validation'));
    ensureDir(join(this.root, 'stability'));
    ensureDir(join(this.root, 'trustworthiness'));
    ensureDir(join(this.root, 'inventory'));
  }

  saveFailure(failure: HistoricalFailure): void {
    const dir = join(this.root, 'failures');
    const path = join(dir, `failure-${failure.id}.json`);
    atomicWrite(path, JSON.stringify(failure, null, 2));
  }

  listFailures(): HistoricalFailure[] {
    const dir = join(this.root, 'failures');
    if (!existsSync(dir)) return [];

    const files = readdirSync(dir).filter(f => f.endsWith('.json'));
    const failures: HistoricalFailure[] = [];

    for (const file of files) {
      const failure = readJson<HistoricalFailure>(join(dir, file));
      if (failure) failures.push(failure);
    }

    return failures;
  }

  saveReplaySession(session: FailureReplaySession): void {
    const dir = join(this.root, 'replay-sessions');
    const path = join(dir, `replay-${session.id}.json`);
    atomicWrite(path, JSON.stringify(session, null, 2));
  }

  saveClassificationReport(report: RealFailureClassificationReport): void {
    const dir = join(this.root, 'classifications');
    const path = join(dir, `classification-${report.id}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-classification.json', report);
  }

  getLatestClassificationReport(): RealFailureClassificationReport | null {
    const path = join(this.root, 'classifications', 'latest-classification.json');
    return readJson<RealFailureClassificationReport>(path);
  }

  saveHealingValidationReport(report: HistoricalHealingValidationReport): void {
    const dir = join(this.root, 'healing-validation');
    const path = join(dir, `healing-validation-${report.id}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-healing-validation.json', report);
  }

  getLatestHealingValidationReport(): HistoricalHealingValidationReport | null {
    const path = join(this.root, 'healing-validation', 'latest-healing-validation.json');
    return readJson<HistoricalHealingValidationReport>(path);
  }

  saveStabilityReport(report: ReplayStabilityReport): void {
    const dir = join(this.root, 'stability');
    const path = join(dir, `stability-${report.id}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-stability.json', report);
  }

  getLatestStabilityReport(): ReplayStabilityReport | null {
    const path = join(this.root, 'stability', 'latest-stability.json');
    return readJson<ReplayStabilityReport>(path);
  }

  saveTrustworthinessReport(report: TrustworthinessBenchmarkReport): void {
    const dir = join(this.root, 'trustworthiness');
    const path = join(dir, `trustworthiness-${report.id}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-trustworthiness.json', report);
  }

  getLatestTrustworthinessReport(): TrustworthinessBenchmarkReport | null {
    const path = join(this.root, 'trustworthiness', 'latest-trustworthiness.json');
    return readJson<TrustworthinessBenchmarkReport>(path);
  }

  saveInventory(inventory: RealWorldFailureInventory): void {
    const dir = join(this.root, 'inventory');
    const path = join(dir, `inventory-${inventory.id}.json`);
    atomicWrite(path, JSON.stringify(inventory, null, 2));
    this.updateLatest(dir, 'latest-inventory.json', inventory);
  }

  getLatestInventory(): RealWorldFailureInventory | null {
    const path = join(this.root, 'inventory', 'latest-inventory.json');
    return readJson<RealWorldFailureInventory>(path);
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