import { resolve } from 'node:path';
import { info, error } from '../../src/logger/index.js';
import { HealingIntelligence, generateIntelligenceSummary } from '../../src/core/healing-intelligence/index.js';

export interface HealingIntelligenceOptions {
  benchmarkPath?: string;
  verbose?: boolean;
}

export async function analyzeHealingIntelligence(options: HealingIntelligenceOptions): Promise<void> {
  const benchmarkPath = options.benchmarkPath
    ? resolve(options.benchmarkPath)
    : undefined;

  info('CLI', 'Healing failure intelligence analysis started');

  try {
    const analyzer = new HealingIntelligence();
    const report = await analyzer.analyzeHealingFailures(benchmarkPath);

    console.log('');
    console.log(generateIntelligenceSummary(report));

    info('CLI', `Intelligence analysis complete. Stability score: ${report.overallStabilityScore}`);
  } catch (err) {
    error('CLI', `Analysis failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}