/**
 * Corpus Discovery
 *
 * Recursively scans all nested folders to detect repositories.
 * Detects repository root using package.json, playwright.config.*, tsconfig.json, .git.
 * Ignores node_modules, dist, build, coverage, .next, generated reports.
 * Prevents duplicate repository registration.
 * Persists normalized repository inventory.
 *
 * No Date.now(). No Math.random(). Deterministic only.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';
import type { DiscoveredRepository, RepositoryInventory, RepositoryMarker } from './types.js';

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.git',
  '.github',
  '.vscode',
  '.idea',
  'reports',
  'test-results',
  'playwright-report',
  'blob-report',
]);

const REPO_MARKERS = [
  'package.json',
  'tsconfig.json',
];

const PLAYWRIGHT_CONFIG_PATTERNS = [
  'playwright.config.ts',
  'playwright.config.js',
  'playwright.config.mjs',
  'playwright.config.cjs',
];

let inventoryCounter = 0;
function nextInventoryId(): string {
  inventoryCounter++;
  return `inventory-${inventoryCounter}`;
}

export class CorpusDiscovery {
  discover(corpusPath: string): RepositoryInventory {
    if (!existsSync(corpusPath)) {
      return {
        inventoryId: nextInventoryId(),
        corpusPath,
        repositories: [],
        totalRepositories: 0,
        categories: [],
        generatedAt: 0,
      };
    }

    const repositories = this.recursiveScan(corpusPath, corpusPath, 0, new Set<string>());
    const sorted = repositories.sort((a, b) => a.path.localeCompare(b.path));
    const categories = [...new Set(sorted.map((r) => r.category))].sort();

    return {
      inventoryId: nextInventoryId(),
      corpusPath,
      repositories: sorted,
      totalRepositories: sorted.length,
      categories,
      generatedAt: 0,
    };
  }

  private recursiveScan(
    rootDir: string,
    currentDir: string,
    depth: number,
    registeredPaths: Set<string>,
  ): DiscoveredRepository[] {
    const repositories: DiscoveredRepository[] = [];

    let entries: string[];
    try {
      entries = readdirSync(currentDir).sort();
    } catch {
      return repositories;
    }

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry)) continue;

      const fullPath = join(currentDir, entry);
      let stat: import('node:fs').Stats;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (!stat.isDirectory()) continue;

      if (this.isRepository(fullPath)) {
        const normalizedPath = this.normalizePath(fullPath);
        if (!registeredPaths.has(normalizedPath)) {
          registeredPaths.add(normalizedPath);
          const category = this.extractCategory(fullPath, rootDir);
          const markers = this.detectMarkers(fullPath);

          repositories.push({
            path: normalizedPath,
            name: basename(fullPath),
            category,
            markers,
            depth,
          });
        }
      } else {
        const nested = this.recursiveScan(rootDir, fullPath, depth + 1, registeredPaths);
        repositories.push(...nested);
      }
    }

    return repositories;
  }

  private isRepository(dirPath: string): boolean {
    for (const marker of REPO_MARKERS) {
      if (existsSync(join(dirPath, marker))) return true;
    }

    for (const pattern of PLAYWRIGHT_CONFIG_PATTERNS) {
      if (existsSync(join(dirPath, pattern))) return true;
    }

    if (existsSync(join(dirPath, '.git'))) return true;

    return false;
  }

  private detectMarkers(dirPath: string): RepositoryMarker {
    return {
      hasPackageJson: existsSync(join(dirPath, 'package.json')),
      hasPlaywrightConfig: PLAYWRIGHT_CONFIG_PATTERNS.some((p) => existsSync(join(dirPath, p))),
      hasTsconfig: existsSync(join(dirPath, 'tsconfig.json')),
      hasGit: existsSync(join(dirPath, '.git')),
    };
  }

  private extractCategory(repoPath: string, rootDir: string): string {
    const relPath = relative(rootDir, repoPath);
    const parts = relPath.split(/[\\/]/);
    if (parts.length > 1) {
      return parts[0]!;
    }
    return 'root';
  }

  private normalizePath(path: string): string {
    return path.replace(/\\/g, '/');
  }
}
