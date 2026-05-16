/**
 * Risk Discrimination Engine
 *
 * Main entry point for risk analysis capabilities.
 * Provides deterministic analysis for detecting deceptive mutations,
 * evaluating replay trustworthiness, identifying governance blind spots,
 * and classifying mutation safety.
 *
 * No autonomous governance - recommendations only.
 */

export * from './types.js';
export { DeceptiveMutationAnalyzer } from './deceptive-mutation-analyzer.js';
export { ReplayTrustworthinessAnalyzer } from './replay-trustworthiness-analyzer.js';
export { GovernanceBlindSpotAnalyzer } from './governance-blind-spot-analyzer.js';
export type { GovernanceAnalysisInput } from './governance-blind-spot-analyzer.js';
export { StructuralRiskEscalation } from './structural-risk-escalation.js';
export type { StructuralRiskInput } from './structural-risk-escalation.js';
export { RiskSimulationEngine } from './risk-simulation.js';
export type { SimulationInput } from './risk-simulation.js';
export { MutationSafetyClassifier } from './mutation-safety-classifier.js';
export type { ClassificationInput } from './mutation-safety-classifier.js';
export { RiskDiscriminationOrchestrator } from './orchestrator.js';

import { FileStorage } from '../storage/file.js';

export class RiskDiscriminationEngine {
  private storage: FileStorage;
  
  constructor(projectRoot: string) {
    this.storage = new FileStorage(projectRoot);
  }
  
  async persistReport(report: unknown, category: string): Promise<void> {
    const dir = `.testguardian/risk-discrimination/${category}`;
    const fs = require('node:fs');
    const path = require('node:path');
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const filename = `${category}-${timestamp}.json`;
    const filepath = path.join(dir, filename);
    
    const tmpPath = filepath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(report, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filepath);
    
    const latestPath = `.testguardian/risk-discrimination/${category}/latest.json`;
    fs.writeFileSync(latestPath, JSON.stringify(report, null, 2), 'utf-8');
  }
  
  async loadLatestReport<T>(category: string): Promise<T | null> {
    const latestPath = `.testguardian/risk-discrimination/${category}/latest.json`;
    const fs = require('node:fs');
    
    if (!fs.existsSync(latestPath)) {
      return null;
    }
    
    try {
      const content = fs.readFileSync(latestPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }
}

export { RiskDiscriminationEngine as default };