/**
 * Playwright Adapter — Full Implementation
 *
 * Implements FrameworkAdapter for Playwright projects.
 * Provides framework detection, test discovery, and AST-based extraction.
 *
 * Communication with core:
 *   - Core calls adapter.detect() → boolean
 *   - Core calls adapter.analyze() → AnalysisResult
 *   - Core calls adapter.extractLocators() → Locator[]
 *
 * @implements {FrameworkAdapter}
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { info, debug, warn } from '../../logger/index.js';
import { detectPlaywright } from '../../core/analyzer/detector.js';
import { scanTestFiles, toRelativePath } from '../../core/analyzer/scanner.js';
import { parseSourceFile } from './parser.js';
import type { FrameworkAdapter } from '../../interfaces/framework.js';
import type { Result } from '../../models/result.js';
import type { TestFile, AdapterCapabilities } from '../../models/framework.js';
import type { Locator } from '../../models/locator.js';
import type { ExecutionTrace } from '../../models/trace.js';
import type { NavigationStep } from '../../models/navigation.js';
import type { DomSnapshot } from '../../models/snapshot.js';
import type { AnalysisResult, DetectedFramework } from '../../core/analyzer/types.js';

export const capabilities: AdapterCapabilities = {
  canRunTests: false,
  canExtractLocators: true,
  canSnapshot: false,
  supportedStrategies: ['css', 'xpath', 'text', 'id', 'testid', 'role', 'placeholder', 'label', 'alt-text', 'title'],
};

export class PlaywrightAdapter implements FrameworkAdapter {
  readonly name = 'playwright';
  readonly capabilities = capabilities;

  private detected: DetectedFramework | null = null;

  detect(projectRoot: string): Result<boolean> {
    const result = detectPlaywright(projectRoot);
    if (result) {
      this.detected = result;
      return { ok: true, value: true };
    }
    return { ok: true, value: false };
  }

  async analyze(projectRoot: string): Promise<Result<AnalysisResult>> {
    if (!this.detected) {
      const detection = detectPlaywright(projectRoot);
      if (!detection) {
        return { ok: false, error: 'Playwright not detected in project' };
      }
      this.detected = detection;
    }

    const startTime = performance.now();
    info('playwright', 'Starting analysis...');

    // 1. Scan for test files
    const scanResult = await scanTestFiles({ projectRoot });
    const testFiles: TestFile[] = [];
    const allLocators: Locator[] = [];
    const allPageObjects: AnalysisResult['pageObjects'] = [];
    const allNavigations: AnalysisResult['navigations'] = [];

    // 2. Parse each test file
    for (const filePath of scanResult.files) {
      debug('playwright', `Parsing ${filePath}`);
      try {
        const sourceCode = readFileSync(filePath, 'utf-8');
        const parseResult = parseSourceFile(filePath, sourceCode);

        // Build TestFile
        const relativePath = toRelativePath(filePath, projectRoot);
        testFiles.push({
          path: filePath,
          relativePath,
          frameworkVersion: this.detected.version ?? 'unknown',
          tests: parseResult.tests.map((t) => ({
            name: t.fullName,
            line: t.line,
            tags: t.tags,
          })),
        });

        // Collect locators
        allLocators.push(...parseResult.locators);

        // Collect page objects (update file paths)
        for (const po of parseResult.pageObjects) {
          allPageObjects.push({
            ...po,
            filePath,
          });
        }

        // Collect navigations
        allNavigations.push(...parseResult.navigations);

        debug('playwright', `  → ${parseResult.tests.length} tests, ${parseResult.locators.length} locators, ${parseResult.pageObjects.length} page objects`);
      } catch (err) {
        warn('playwright', `Failed to parse ${filePath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // 3. Deduplicate locators by ID
    const seenIds = new Set<string>();
    const uniqueLocators = allLocators.filter((l) => {
      if (seenIds.has(l.id)) return false;
      seenIds.add(l.id);
      return true;
    });

    const durationMs = performance.now() - startTime;

    const result: AnalysisResult = {
      framework: this.detected,
      testFiles,
      locators: uniqueLocators,
      pageObjects: allPageObjects,
      navigations: allNavigations,
      stats: {
        totalFiles: testFiles.length,
        totalTests: testFiles.reduce((sum, f) => sum + f.tests.length, 0),
        totalLocators: uniqueLocators.length,
        totalPageObjects: allPageObjects.length,
        totalNavigations: allNavigations.length,
        analyzedAt: Date.now(),
        durationMs: Math.round(durationMs),
      },
    };

    info('playwright', `Analysis complete: ${result.stats.totalFiles} files, ${result.stats.totalTests} tests, ${result.stats.totalLocators} locators (${Math.round(durationMs)}ms)`);

    return { ok: true, value: result };
  }

  discoverTests(projectRoot: string): Result<TestFile[]> {
    // Not yet implemented as a standalone operation
    return { ok: true, value: [] };
  }

  extractLocators(filePath: string): Result<Locator[]> {
    try {
      const sourceCode = readFileSync(filePath, 'utf-8');
      const parseResult = parseSourceFile(filePath, sourceCode);
      return { ok: true, value: parseResult.locators };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // Runtime execution stubs (not implemented for milestone 1)
  async runTest(_filePath: string, _testName?: string): Promise<Result<ExecutionTrace>> {
    return { ok: false, error: 'Runtime execution not available in analyze mode' };
  }

  async executeStep(_step: NavigationStep): Promise<Result<DomSnapshot>> {
    return { ok: false, error: 'Runtime execution not available in analyze mode' };
  }

  async captureSnapshot(): Promise<Result<DomSnapshot>> {
    return { ok: false, error: 'Runtime execution not available in analyze mode' };
  }
}
