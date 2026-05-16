/**
 * Architecture Cohesion Audit Storage
 *
 * Persists audit results to .testguardian/architecture-cohesion-audit/
 * Uses atomic writes for corruption safety.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ModuleBoundaryAuditReport,
  SemanticConsistencyReport,
  PersistenceCohesionReport,
  DependencyStabilityReport,
  DeterminismIntegrityReport,
  TechnicalDebtInventoryReport,
  ArchitectureCohesionAuditResult,
} from './types.js';

const ROOT_DIR = '.testguardian/architecture-cohesion-audit';

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

export class ArchitectureCohesionStorage {
  private root: string;

  constructor(projectRoot: string = '.') {
    this.root = join(projectRoot, ROOT_DIR);
    ensureDir(this.root);
    ensureDir(join(this.root, 'module-boundary'));
    ensureDir(join(this.root, 'semantic-consistency'));
    ensureDir(join(this.root, 'persistence-schema'));
    ensureDir(join(this.root, 'dependency-stability'));
    ensureDir(join(this.root, 'determinism-integrity'));
    ensureDir(join(this.root, 'technical-debt'));
    ensureDir(join(this.root, 'full-audits'));
  }

  saveModuleBoundaryReport(report: ModuleBoundaryAuditReport): void {
    const dir = join(this.root, 'module-boundary');
    const path = join(dir, `module-boundary-${report.id}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-module-boundary.json', report);
  }

  getLatestModuleBoundaryReport(): ModuleBoundaryAuditReport | null {
    const path = join(this.root, 'module-boundary', 'latest-module-boundary.json');
    return readJson<ModuleBoundaryAuditReport>(path);
  }

  saveSemanticConsistencyReport(report: SemanticConsistencyReport): void {
    const dir = join(this.root, 'semantic-consistency');
    const path = join(dir, `semantic-consistency-${report.id}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-semantic-consistency.json', report);
  }

  getLatestSemanticConsistencyReport(): SemanticConsistencyReport | null {
    const path = join(this.root, 'semantic-consistency', 'latest-semantic-consistency.json');
    return readJson<SemanticConsistencyReport>(path);
  }

  savePersistenceCohesionReport(report: PersistenceCohesionReport): void {
    const dir = join(this.root, 'persistence-schema');
    const path = join(dir, `persistence-cohesion-${report.id}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-persistence-cohesion.json', report);
  }

  getLatestPersistenceCohesionReport(): PersistenceCohesionReport | null {
    const path = join(this.root, 'persistence-schema', 'latest-persistence-cohesion.json');
    return readJson<PersistenceCohesionReport>(path);
  }

  saveDependencyStabilityReport(report: DependencyStabilityReport): void {
    const dir = join(this.root, 'dependency-stability');
    const path = join(dir, `dependency-stability-${report.id}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-dependency-stability.json', report);
  }

  getLatestDependencyStabilityReport(): DependencyStabilityReport | null {
    const path = join(this.root, 'dependency-stability', 'latest-dependency-stability.json');
    return readJson<DependencyStabilityReport>(path);
  }

  saveDeterminismIntegrityReport(report: DeterminismIntegrityReport): void {
    const dir = join(this.root, 'determinism-integrity');
    const path = join(dir, `determinism-integrity-${report.id}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-determinism-integrity.json', report);
  }

  getLatestDeterminismIntegrityReport(): DeterminismIntegrityReport | null {
    const path = join(this.root, 'determinism-integrity', 'latest-determinism-integrity.json');
    return readJson<DeterminismIntegrityReport>(path);
  }

  saveTechnicalDebtReport(report: TechnicalDebtInventoryReport): void {
    const dir = join(this.root, 'technical-debt');
    const path = join(dir, `technical-debt-${report.id}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-technical-debt.json', report);
  }

  getLatestTechnicalDebtReport(): TechnicalDebtInventoryReport | null {
    const path = join(this.root, 'technical-debt', 'latest-technical-debt.json');
    return readJson<TechnicalDebtInventoryReport>(path);
  }

  saveFullAudit(result: ArchitectureCohesionAuditResult): void {
    const dir = join(this.root, 'full-audits');
    const path = join(dir, `full-audit-${Date.now()}.json`);
    atomicWrite(path, JSON.stringify(result, null, 2));
    this.updateLatest(dir, 'latest-full-audit.json', result);
  }

  getLatestFullAudit(): ArchitectureCohesionAuditResult | null {
    const path = join(this.root, 'full-audits', 'latest-full-audit.json');
    return readJson<ArchitectureCohesionAuditResult>(path);
  }

  private updateLatest(dir: string, filename: string, data: unknown): void {
    const path = join(dir, filename);
    atomicWrite(path, JSON.stringify(data, null, 2));
  }
}