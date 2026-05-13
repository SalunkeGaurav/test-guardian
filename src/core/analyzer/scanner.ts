/**
 * Test File Scanner
 *
 * Discovers test files by globbing for common test file patterns.
 * Respects Playwright defaults and ignores node_modules.
 *
 * Default patterns (matching Playwright's built-in defaults):
 *   - ** /*.@(spec|test).?(c|m)[jt]s?(x)
 */

import { resolve, relative } from 'node:path';
import fg from 'fast-glob';
import { info, debug, warn } from '../../logger/index.js';

const DEFAULT_TEST_PATTERNS = [
  '**/*.spec.ts',
  '**/*.spec.js',
  '**/*.spec.tsx',
  '**/*.spec.jsx',
  '**/*.test.ts',
  '**/*.test.js',
  '**/*.test.tsx',
  '**/*.test.jsx',
];

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.git/**',
  '**/__snapshots__/**',
  '**/__fixtures__/**',
];

export interface ScanOptions {
  /** Absolute path to the project root. */
  projectRoot: string;
  /** Optional custom patterns (overrides defaults). */
  patterns?: string[];
  /** Additional ignore patterns. */
  ignore?: string[];
}

export interface ScanResult {
  files: string[];
  projectRoot: string;
}

/**
 * Scan the project for test files matching typical Playwright patterns.
 * Returns absolute paths to all discovered test files.
 */
export async function scanTestFiles(options: ScanOptions): Promise<ScanResult> {
  const patterns = options.patterns ?? DEFAULT_TEST_PATTERNS;
  const ignore = [...DEFAULT_IGNORE, ...(options.ignore ?? [])];

  info('scanner', `Scanning for test files in ${options.projectRoot}`);
  debug('scanner', `Patterns: ${patterns.join(', ')}`);

  const entries = await fg(patterns, {
    cwd: options.projectRoot,
    absolute: true,
    ignore,
    onlyFiles: true,
  });

  // Sort for determinism
  entries.sort();

  info('scanner', `Found ${entries.length} test file(s)`);

  return {
    files: entries,
    projectRoot: options.projectRoot,
  };
}

/**
 * Get the relative path of a file within the project.
 */
export function toRelativePath(absolutePath: string, projectRoot: string): string {
  return relative(projectRoot, absolutePath).replace(/\\/g, '/');
}
