import { resolve } from 'node:path';
import { info, error } from '../../src/logger/index.js';
import { PatternIntelligence, generatePatternSummary } from '../../src/core/pattern-intelligence/index.js';

export interface PatternIntelligenceOptions {
  path?: string;
  verbose?: boolean;
}

export async function extractPatternIntelligence(options: PatternIntelligenceOptions): Promise<void> {
  const repoPath = options.path ? resolve(options.path) : resolve(process.cwd());

  info('CLI', `Pattern intelligence extraction started for: ${repoPath}`);

  try {
    const extractor = new PatternIntelligence();
    const report = await extractor.extractIntelligence(repoPath);

    console.log('');
    console.log(generatePatternSummary(report));

    info('CLI', `Intelligence extraction complete. Compatibility tier: ${report.compatibilityTaxonomy.tier}`);
  } catch (err) {
    error('CLI', `Pattern extraction failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}