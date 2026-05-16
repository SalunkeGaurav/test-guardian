import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { info, warn } from '../../src/logger/index.js';

const STRUCTURE: Record<string, string> = {
  'traces': 'Execution trace storage',
  'snapshots': 'DOM snapshot storage',
  'locators': 'Locator index storage',
  'patches': 'Patch record storage',
};

export async function init(): Promise<void> {
  const root = resolve(process.cwd());
  const tgDir = join(root, '.testguardian');

  if (existsSync(tgDir)) {
    info('init', '.testguardian already exists');
    return;
  }

  mkdirSync(tgDir, { recursive: true });

  for (const [name, _description] of Object.entries(STRUCTURE)) {
    const dir = join(tgDir, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '.gitkeep'), '', 'utf-8');
  }

  writeFileSync(join(tgDir, 'index.json'), JSON.stringify({
    version: '0.1.0',
    createdAt: Date.now(),
    schemaVersion: '1.0.0',
  }, null, 2), 'utf-8');

  writeFileSync(join(tgDir, 'README.md'), `# .testguardian

This directory is managed by TestGuardian. Do not edit manually.

## Structure

- \`index.json\` — Project metadata
- \`traces/\` — Execution traces from test runs
- \`snapshots/\` — DOM snapshots captured during tracing
- \`locators/\` — Locator index for healing and analysis
- \`patches/\` — Healing patch proposals and history
`, 'utf-8');

  info('init', `Initialized .testguardian at ${tgDir}`);
}
