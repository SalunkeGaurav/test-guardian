/**
 * Risk Discrimination Storage
 *
 * Persists risk discrimination reports to .testguardian/risk-discrimination/
 * Uses atomic writes for corruption safety.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type {
  DeceptiveMutationReport,
  ReplayTrustworthinessReport,
  GovernanceBlindSpotReport,
  RiskSimulationReport,
  MutationSafetyClassification,
  RiskDiscriminationAnalysis,
} from './types.js';

const ROOT_DIR = '.testguardian/risk-discrimination';

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

export class RiskDiscriminationStorage {
  private root: string;
  
  constructor(projectRoot: string = '.') {
    this.root = join(projectRoot, ROOT_DIR);
    ensureDir(this.root);
    ensureDir(join(this.root, 'deceptive-mutations'));
    ensureDir(join(this.root, 'replay-trust'));
    ensureDir(join(this.root, 'governance-blindspots'));
    ensureDir(join(this.root, 'simulations'));
    ensureDir(join(this.root, 'classifications'));
    ensureDir(join(this.root, 'analyses'));
  }
  
  saveDeceptiveMutation(report: DeceptiveMutationReport): void {
    const dir = join(this.root, 'deceptive-mutations');
    const path = join(dir, `deceptive-${report.candidateId}-${report.id.split('-').pop()}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-deceptive.json', report);
  }
  
  getLatestDeceptiveReport(): DeceptiveMutationReport | null {
    const path = join(this.root, 'deceptive-mutations', 'latest-deceptive.json');
    return readJson<DeceptiveMutationReport>(path);
  }
  
  listDeceptiveReports(): DeceptiveMutationReport[] {
    const dir = join(this.root, 'deceptive-mutations');
    if (!existsSync(dir)) return [];
    
    const files = readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'latest-deceptive.json');
    const reports: DeceptiveMutationReport[] = [];
    
    for (const file of files) {
      const report = readJson<DeceptiveMutationReport>(join(dir, file));
      if (report) reports.push(report);
    }
    
    return reports.sort((a, b) => b.createdAt - a.createdAt);
  }
  
  saveReplayTrust(report: ReplayTrustworthinessReport): void {
    const dir = join(this.root, 'replay-trust');
    const path = join(dir, `replay-trust-${report.candidateId}-${report.id.split('-').pop()}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-replay-trust.json', report);
  }
  
  getLatestReplayTrustReport(): ReplayTrustworthinessReport | null {
    const path = join(this.root, 'replay-trust', 'latest-replay-trust.json');
    return readJson<ReplayTrustworthinessReport>(path);
  }
  
  saveGovernanceBlindSpot(report: GovernanceBlindSpotReport): void {
    const dir = join(this.root, 'governance-blindspots');
    const path = join(dir, `governance-blindspot-${report.id.split('-').pop()}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-governance.json', report);
  }
  
  getLatestGovernanceReport(): GovernanceBlindSpotReport | null {
    const path = join(this.root, 'governance-blindspots', 'latest-governance.json');
    return readJson<GovernanceBlindSpotReport>(path);
  }
  
  saveSimulation(report: RiskSimulationReport): void {
    const dir = join(this.root, 'simulations');
    const path = join(dir, `simulation-${report.id.split('-').pop()}.json`);
    atomicWrite(path, JSON.stringify(report, null, 2));
    this.updateLatest(dir, 'latest-simulation.json', report);
  }
  
  getLatestSimulationReport(): RiskSimulationReport | null {
    const path = join(this.root, 'simulations', 'latest-simulation.json');
    return readJson<RiskSimulationReport>(path);
  }
  
  saveClassification(classification: MutationSafetyClassification): void {
    const dir = join(this.root, 'classifications');
    const path = join(dir, `classification-${classification.candidateId}-${classification.id.split('-').pop()}.json`);
    atomicWrite(path, JSON.stringify(classification, null, 2));
  }
  
  saveAnalysis(analysis: RiskDiscriminationAnalysis): void {
    const dir = join(this.root, 'analyses');
    const path = join(dir, `analysis-${analysis.safetyClassification.candidateId}-${Date.now()}.json`);
    atomicWrite(path, JSON.stringify(analysis, null, 2));
    this.updateLatest(dir, 'latest-analysis.json', analysis);
  }
  
  getLatestAnalysis(): RiskDiscriminationAnalysis | null {
    const path = join(this.root, 'analyses', 'latest-analysis.json');
    return readJson<RiskDiscriminationAnalysis>(path);
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