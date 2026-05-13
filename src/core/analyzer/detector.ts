/**
 * Framework Detector
 *
 * Determines which test framework a project uses by examining:
 * 1. Presence of framework config files (playwright.config.ts, etc.)
 * 2. Framework dependencies in package.json
 *
 * Pure detection — no file parsing beyond config checks.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { info, warn, debug } from '../../logger/index.js';
import type { DetectedFramework } from './types.js';

const CONFIG_FILES = [
  'playwright.config.ts',
  'playwright.config.js',
  'playwright.config.mjs',
  'playwright.config.cjs',
];

const PLAYWRIGHT_PACKAGES = ['@playwright/test', 'playwright'];

/**
 * Detect if the project at `projectRoot` uses Playwright.
 * Returns the detected framework info or null.
 */
export function detectPlaywright(projectRoot: string): DetectedFramework | null {
  // 1. Check for config files
  for (const cfg of CONFIG_FILES) {
    const cfgPath = resolve(join(projectRoot, cfg));
    if (existsSync(cfgPath)) {
      info('detector', `Found Playwright config: ${cfg}`);
      return {
        name: 'playwright',
        version: detectVersion(projectRoot),
        configPath: cfgPath,
        detectionSource: 'config',
      };
    }
  }

  // 2. Check package.json for dependencies
  const pkgPath = join(projectRoot, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const pw of PLAYWRIGHT_PACKAGES) {
        if (allDeps[pw]) {
          debug('detector', `Found Playwright dependency: ${pw}@${allDeps[pw]}`);
          return {
            name: 'playwright',
            version: allDeps[pw]?.replace(/^[\^~]/, '') ?? null,
            configPath: null,
            detectionSource: 'dependency',
          };
        }
      }
    } catch {
      warn('detector', 'Could not parse package.json');
    }
  }

  return null;
}

function detectVersion(projectRoot: string): string | null {
  try {
    const pkgPath = join(projectRoot, 'package.json');
    if (!existsSync(pkgPath)) return null;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const pw of PLAYWRIGHT_PACKAGES) {
      if (allDeps[pw]) {
        return allDeps[pw]?.replace(/^[\^~]/, '') ?? null;
      }
    }
  } catch {
    // ignore
  }
  return null;
}
