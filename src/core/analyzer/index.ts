import { info, span } from '../../logger/index.js';
import type { PlaywrightAdapter } from '../../adapters/playwright/index.js';
import type {
  AnalysisResult, FrameworkMap, LocatorRecord, AnalysisMeta,
  PageObjectDefinition,
} from './types.js';
import type { StorageProvider } from '../../interfaces/storage.js';

export type FrameworkAdapterInstance = PlaywrightAdapter;

const ANALYSIS_VERSION = '0.1.0';
const SCHEMA_VERSION = '1.0.0';

export async function analyzeProject(
  projectRoot: string,
  adapter: FrameworkAdapterInstance,
  storage: StorageProvider,
): Promise<AnalysisResult> {
  const endSpan = span('analyzer', `Analyzing ${projectRoot}`);

  const result = await adapter.analyze(projectRoot);
  if (!result.ok) {
    throw new Error(`Analysis failed: ${result.error}`);
  }

  const analysis = result.value;

  const frameworkMap = buildFrameworkMap(analysis);
  const locatorRecords = buildLocatorRecords(analysis);
  const analysisMeta = buildAnalysisMeta(analysis);

  const persistResult = await storage.saveAnalysis(projectRoot, frameworkMap, locatorRecords, analysisMeta);
  if (!persistResult.ok) {
    throw new Error(`Persistence failed: ${persistResult.error}`);
  }

  endSpan();
  return analysis;
}

function buildFrameworkMap(result: AnalysisResult): FrameworkMap {
  // Compute per-file locator IDs from the raw locator list
  const fileLocatorIds = new Map<string, Set<string>>();
  const fileNavCounts = new Map<string, number>();
  for (const loc of result.locators) {
    if (!fileLocatorIds.has(loc.sourceFile)) {
      fileLocatorIds.set(loc.sourceFile, new Set());
    }
    fileLocatorIds.get(loc.sourceFile)!.add(loc.id);
  }
  for (const nav of result.navigations) {
    fileNavCounts.set(nav.filePath, (fileNavCounts.get(nav.filePath) ?? 0) + 1);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    framework: result.framework,
    testFiles: result.testFiles.map((f) => ({
      path: f.path,
      relativePath: f.relativePath,
      tests: f.tests.map((t) => ({ name: t.name, line: t.line, tags: t.tags })),
      locatorIds: Array.from(fileLocatorIds.get(f.path) ?? []),
      navigationCount: fileNavCounts.get(f.path) ?? 0,
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
    navigations: result.navigations.map((n) => ({
      url: n.url,
      urlPattern: n.urlPattern,
      filePath: n.filePath,
      line: n.line,
      contextName: n.contextName,
    })),
    totalTests: result.stats.totalTests,
    totalLocators: result.stats.totalLocators,
    totalNavigations: result.stats.totalNavigations,
    analyzedAt: result.stats.analyzedAt,
  };
}

function buildLocatorRecords(result: AnalysisResult): LocatorRecord[] {
  // Build locator ID → page object name map
  const poMap = new Map<string, string>();
  for (const po of result.pageObjects) {
    for (const loc of po.locators) {
      poMap.set(loc.id, po.name);
    }
  }

  return result.locators.map((l) => ({
    id: l.id,
    strategy: l.strategy,
    value: l.value,
    expression: l.expression,
    sourceFile: l.sourceFile,
    sourceLine: l.sourceLine,
    context: l.context,
    propertyName: l.propertyName,
    pageObjectName: poMap.get(l.id) ?? null,
    occurrences: result.locatorCounts[l.id] ?? 1,
    verified: l.verified,
  }));
}

function buildAnalysisMeta(result: AnalysisResult): AnalysisMeta {
  return {
    analysisVersion: ANALYSIS_VERSION,
    schemaVersion: SCHEMA_VERSION,
    analyzedAt: result.stats.analyzedAt,
    durationMs: result.stats.durationMs,
    fileCount: result.stats.totalFiles,
    skippedCount: result.stats.totalSkipped,
    parserWarnings: result.parserWarnings,
  };
}
