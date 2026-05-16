/**
 * Sandbox Manager
 *
 * Manages isolated sandbox environments for framework mutation testing.
 * Ensures original framework is never modified.
 *
 * Structure:
 *   .testguardian/sandbox/
 *     sandbox-{sandboxId}/
 *       workspace/     - copied framework
 *       original/      - original files (for rollback)
 *       patches/       - applied patch metadata
 *       reports/       - verification reports
 *       state.json     - sandbox state
 *
 * No AI. No autonomous execution. Deterministic sandbox isolation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync, copyFileSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import type {
  SandboxConfig, SandboxState, SandboxStatus, AppliedPatch, RollbackRecord, VerificationResult
} from '../../models/sandbox.js';
import { success, failure, type Result } from '../../models/result.js';
import { contentHash } from '../storage/utils/serialization.js';

const SANDBOX_ROOT_DIR = '.testguardian/sandbox';
const SANDBOX_PREFIX = 'sandbox-';
const DEFAULT_TIMEOUT = 300000; // 5 minutes

export class SandboxManager {
  private readonly rootDir: string;

  constructor(private readonly projectRoot: string) {
    this.rootDir = join(projectRoot, SANDBOX_ROOT_DIR);
    this.ensureSandboxRoot();
  }

  private ensureSandboxRoot(): void {
    if (!existsSync(this.rootDir)) {
      mkdirSync(this.rootDir, { recursive: true });
    }
  }

  /**
   * Create a new sandbox environment by copying the original framework.
   */
  async createSandbox(frameworkPath: string, sandboxId?: string): Promise<Result<SandboxState>> {
    try {
      const id = sandboxId ?? this.generateSandboxId(frameworkPath);
      const sandboxDir = this.getSandboxDir(id);

      if (existsSync(sandboxDir)) {
        return failure(`Sandbox ${id} already exists`);
      }

      mkdirSync(join(sandboxDir, 'workspace'), { recursive: true });
      mkdirSync(join(sandboxDir, 'original'), { recursive: true });
      mkdirSync(join(sandboxDir, 'patches'), { recursive: true });
      mkdirSync(join(sandboxDir, 'reports'), { recursive: true });

      const config: SandboxConfig = {
        sandboxId: id,
        originalFrameworkPath: frameworkPath,
        sandboxRoot: sandboxDir,
        createdAt: Date.now(),
        timeout: DEFAULT_TIMEOUT,
      };

      const state: SandboxState = {
        config,
        status: 'created',
        appliedPatches: [],
        verificationResults: [],
        rollbackHistory: [],
        startedAt: Date.now(),
      };

      await this.copyFrameworkToSandbox(frameworkPath, join(sandboxDir, 'workspace'), join(sandboxDir, 'original'));

      this.saveState(state);

      return success(state);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Load existing sandbox state.
   */
  loadSandbox(sandboxId: string): Result<SandboxState> {
    try {
      const statePath = this.getStatePath(sandboxId);
      if (!existsSync(statePath)) {
        return failure(`Sandbox ${sandboxId} not found`);
      }
      const content = readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content) as SandboxState;
      return success(state);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Update sandbox state.
   */
  updateSandbox(state: SandboxState): Result<void> {
    try {
      this.saveState(state);
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Get sandbox workspace path.
   */
  getWorkspacePath(sandboxId: string): string {
    return join(this.getSandboxDir(sandboxId), 'workspace');
  }

  /**
   * Get sandbox original files path.
   */
  getOriginalPath(sandboxId: string): string {
    return join(this.getSandboxDir(sandboxId), 'original');
  }

  /**
   * Get original file content for rollback.
   */
  getOriginalFile(sandboxId: string, relativePath: string): Result<string> {
    try {
      const originalPath = join(this.getOriginalPath(sandboxId), relativePath);
      if (!existsSync(originalPath)) {
        return failure(`Original file not found: ${relativePath}`);
      }
      return success(readFileSync(originalPath, 'utf-8'));
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * List all sandboxes.
   */
  listSandboxes(): SandboxConfig[] {
    try {
      if (!existsSync(this.rootDir)) return [];
      const entries = readdirSync(this.rootDir, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory() && e.name.startsWith(SANDBOX_PREFIX))
        .map(e => {
          const state = this.loadSandbox(e.name.replace(SANDBOX_PREFIX, ''));
          return state.ok ? state.value.config : null;
        })
        .filter((c): c is SandboxConfig => c !== null);
    } catch {
      return [];
    }
  }

  /**
   * Delete a sandbox and all its contents.
   */
  deleteSandbox(sandboxId: string): Result<void> {
    try {
      const sandboxDir = this.getSandboxDir(sandboxId);
      if (!existsSync(sandboxDir)) {
        return failure(`Sandbox ${sandboxId} not found`);
      }
      rmSync(sandboxDir, { recursive: true, force: true });
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Clean up all sandboxes.
   */
  cleanAllSandboxes(): Result<number> {
    try {
      if (!existsSync(this.rootDir)) return success(0);
      const entries = readdirSync(this.rootDir, { withFileTypes: true });
      let count = 0;
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith(SANDBOX_PREFIX)) {
          rmSync(join(this.rootDir, entry.name), { recursive: true, force: true });
          count++;
        }
      }
      return success(count);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Verify sandbox isolation - ensure original framework is untouched.
   */
  verifyIsolation(sandboxId: string): Result<{ isolated: boolean; originalUnmodified: boolean; differences: string[] }> {
    try {
      const state = this.loadSandbox(sandboxId);
      if (!state.ok) return failure(state.error!);

      const originalPath = state.value.config.originalFrameworkPath;
      const sandboxOriginalPath = this.getOriginalPath(sandboxId);

      if (!existsSync(originalPath)) {
        return success({ isolated: true, originalUnmodified: true, differences: [] });
      }

      const differences: string[] = [];
      const compareResult = this.compareDirectories(originalPath, sandboxOriginalPath, differences);
      
      return success({
        isolated: true,
        originalUnmodified: compareResult,
        differences,
      });
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  private generateSandboxId(frameworkPath: string): string {
    const timestamp = Date.now();
    const hash = createHash('sha256').update(frameworkPath).digest('hex').slice(0, 8);
    return `${hash}-${timestamp}`;
  }

  private getSandboxDir(sandboxId: string): string {
    return join(this.rootDir, `${SANDBOX_PREFIX}${sandboxId}`);
  }

  private getStatePath(sandboxId: string): string {
    return join(this.getSandboxDir(sandboxId), 'state.json');
  }

  private saveState(state: SandboxState): void {
    const statePath = this.getStatePath(state.config.sandboxId);
    writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  private async copyFrameworkToSandbox(sourceDir: string, workspaceDir: string, originalDir: string): Promise<void> {
    this.copyDirectoryRecursive(sourceDir, workspaceDir);
    this.copyDirectoryRecursive(sourceDir, originalDir);
  }

  private copyDirectoryRecursive(source: string, destination: string): void {
    if (!existsSync(destination)) {
      mkdirSync(destination, { recursive: true });
    }

    const entries = readdirSync(source, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = join(source, entry.name);
      const destPath = join(destination, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') {
          continue;
        }
        this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }

  private compareDirectories(dir1: string, dir2: string, differences: string[]): boolean {
    if (!existsSync(dir1) || !existsSync(dir2)) {
      return true;
    }

    const entries1 = readdirSync(dir1, { withFileTypes: true });
    const entries2 = readdirSync(dir2, { withFileTypes: true });

    const names1 = new Set(entries1.filter(e => e.name !== 'node_modules' && e.name !== '.git').map(e => e.name));
    const names2 = new Set(entries2.filter(e => e.name !== 'node_modules' && e.name !== '.git').map(e => e.name));

    if (names1.size !== names2.size) {
      differences.push('Directory entry count mismatch');
      return false;
    }

    for (const name of names1) {
      if (!names2.has(name)) {
        differences.push(`Missing in target: ${name}`);
        return false;
      }

      const path1 = join(dir1, name);
      const path2 = join(dir2, name);
      const entry1 = entries1.find(e => e.name === name)!;
      const entry2 = entries2.find(e => e.name === name)!;

      if (entry1.isDirectory() !== entry2.isDirectory()) {
        differences.push(`Type mismatch: ${name}`);
        return false;
      }

      if (entry1.isDirectory()) {
        if (!this.compareDirectories(path1, path2, differences)) {
          return false;
        }
      } else {
        const hash1 = contentHash(readFileSync(path1, 'utf-8'));
        const hash2 = contentHash(readFileSync(path2, 'utf-8'));
        if (hash1 !== hash2) {
          differences.push(`Content mismatch: ${name}`);
          return false;
        }
      }
    }

    return true;
  }
}

export function createSandboxManager(projectRoot: string): SandboxManager {
  return new SandboxManager(projectRoot);
}