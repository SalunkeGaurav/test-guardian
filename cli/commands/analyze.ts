/**
 * analyze — CLI command implementation.
 *
 * Detects Playwright in the current project, scans test files,
 * extracts test structure, locators, page objects, and navigation patterns.
 *
 * Outputs:
 *   .testguardian/framework-map.json
 *   .testguardian/locators.json
 *   .testguardian/index.json (updated)
 *
 * Usage:
 *   tg analyze
 *   tg analyze --adapter playwright
 *   tg analyze --verbose
 */

import { resolve } from 'node:path';
import { info, warn, error, setLogLevel } from '../../src/logger/index.js';
import { analyzeProject } from '../../src/core/analyzer/index.js';
import { PlaywrightAdapter } from '../../src/adapters/playwright/index.js';
import type { LogLevel } from '../../src/logger/index.js';

export interface AnalyzeOptions {
  adapter?: string;
  verbose?: boolean;
}

export async function analyze(options: AnalyzeOptions): Promise<void> {
  if (options.verbose) {
    setLogLevel('debug' as LogLevel);
  }

  info('CLI', 'tg analyze started');

  const projectRoot = resolve(process.cwd());

  // 1. Detect and select adapter
  if (options.adapter && options.adapter !== 'playwright') {
    error('CLI', `Unsupported adapter: ${options.adapter}. Only 'playwright' is supported in this version.`);
    process.exit(1);
  }

  const adapter = new PlaywrightAdapter();
  const detection = adapter.detect(projectRoot);

  if (!detection.ok || !detection.value) {
    error('CLI', 'No Playwright project detected. Run `npx playwright init` first, or check that playwright.config.* exists.');
    process.exit(1);
  }

  info('CLI', 'Playwright detected. Starting analysis...');

  // 2. Run analysis
  try {
    const result = await analyzeProject(projectRoot, adapter);

    // 3. Print summary
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║        TestGuardian Analysis             ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    printValue('Framework', `${result.framework.name} ${result.framework.version ?? ''}`);
    printValue('Config', result.framework.configPath ?? '(in package.json)');
    console.log('');
    printValue('Test files', String(result.stats.totalFiles));
    printValue('Tests', String(result.stats.totalTests));
    printValue('Locators', String(result.stats.totalLocators));
    printValue('Page objects', String(result.stats.totalPageObjects));
    printValue('Navigations', String(result.stats.totalNavigations));
    console.log('');
    printValue('Duration', `${result.stats.durationMs}ms`);
    printValue('Output', '.testguardian/framework-map.json');
    console.log('');

    info('CLI', 'Analysis complete');
  } catch (err) {
    error('CLI', `Analysis failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

function printValue(label: string, value: string): void {
  console.log(`  ${label.padEnd(16)} ${value}`);
}
