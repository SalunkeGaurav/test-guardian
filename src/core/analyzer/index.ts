/**
 * Analyzer Module — Orchestrator
 *
 * Entry point for all analysis workflows.
 * Coordinates framework detection, test file scanning, and metadata extraction.
 *
 * Flow:
 *   1. Detect framework (delegates to detector)
 *   2. Find the right adapter
 *   3. Run adapter.analyze() to extract all metadata
 *   4. Generate framework-map.json and persist to .testguardian/
 *   5. Store locator metadata
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { info, warn, span } from '../../logger/index.js';
import type { PlaywrightAdapter } from '../../adapters/playwright/index.js';
import type { AnalysisResult, FrameworkMap } from './types.js';

export type FrameworkAdapterInstance = PlaywrightAdapter;

/**
 * Run the full analysis pipeline on a project.
 */
export async function analyzeProject(
  projectRoot: string,
  adapter: FrameworkAdapterInstance,
): Promise<AnalysisResult> {
  const endSpan = span('analyzer', `Analyzing ${projectRoot}`);

  // 1. Run adapter analysis
  const result = await adapter.analyze(projectRoot);
  if (!result.ok) {
    throw new Error(`Analysis failed: ${result.error}`);
  }

  // 2. Generate and persist artifacts
  persistAnalysis(projectRoot, result.value);

  endSpan();
  return result.value;
}

/**
 * Generate and write analysis artifacts to .testguardian/.
 */
function persistAnalysis(projectRoot: string, result: AnalysisResult): void {
  const tgDir = resolve(join(projectRoot, '.testguardian'));
  if (!existsSync(tgDir)) {
    mkdirSync(tgDir, { recursive: true });
  }

  // 2a. Write framework-map.json
  const frameworkMap: FrameworkMap = {
    framework: result.framework,
    testFiles: result.testFiles.map((f) => ({
      path: f.path,
      relativePath: f.relativePath,
      tests: f.tests.map((t) => ({
        name: t.name,
        line: t.line,
        tags: t.tags,
      })),
    })),
    pageObjects: result.pageObjects.map((po) => ({
      name: po.name,
      file: po.filePath,
      locators: po.locators.map((l) => ({
        name: l.propertyName ?? '<inline>',
        strategy: l.strategy,
        value: l.value,
      })),
    })),
    totalTests: result.stats.totalTests,
    analyzedAt: result.stats.analyzedAt,
  };

  const mapPath = join(tgDir, 'framework-map.json');
  writeFileSync(mapPath, JSON.stringify(frameworkMap, null, 2), 'utf-8');
  info('analyzer', `Wrote ${mapPath}`);

  // 2b. Write locators.json
  const locatorsPath = join(tgDir, 'locators.json');
  const locatorJson = result.locators.map((l) => ({
    id: l.id,
    strategy: l.strategy,
    value: l.value,
    expression: l.expression,
    sourceFile: l.sourceFile,
    sourceLine: l.sourceLine,
    context: l.context,
    propertyName: l.propertyName,
    verified: l.verified,
  }));
  writeFileSync(locatorsPath, JSON.stringify(locatorJson, null, 2), 'utf-8');
  info('analyzer', `Wrote ${locatorsPath} (${locatorJson.length} locators)`);

  // 2c. Update index.json with stats
  const indexPath = join(tgDir, 'index.json');
  const indexData: Record<string, unknown> = {
    version: '0.1.0',
    framework: result.framework,
    createdAt: Date.now(),
    analyzedAt: result.stats.analyzedAt,
    lastTraceAt: null,
    stats: {
      totalTraces: 0,
      totalLocators: result.stats.totalLocators,
      totalPatches: 0,
      healedLocators: 0,
    },
  };
  writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
  info('analyzer', `Updated ${indexPath}`);
}
