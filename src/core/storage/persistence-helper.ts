/**
 * Persistence Helper
 *
 * Centralized persistence utility that replaces duplicated
 * mkdirSync + writeFileSync patterns across 26+ modules.
 *
 * Provides deterministic, atomic file writing with proper
 * directory creation and schema versioning support.
 *
 * @module persistence-helper
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

export interface PersistOptions {
  /** Base directory for persistence */
  baseDir: string;
  /** Subdirectory within baseDir */
  subdir?: string;
  /** File name (without extension) */
  fileName: string;
  /** Data to persist (will be JSON stringified) */
  data: unknown;
  /** Whether to use atomic write (write to temp, then rename) */
  atomic?: boolean;
  /** Schema version for forward compatibility */
  schemaVersion?: number;
}

export interface PersistResult {
  /** Path to the persisted file */
  path: string;
  /** Size of the written file in bytes */
  size: number;
}

/**
 * Ensure directory exists, creating it if necessary.
 */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Atomically write JSON data to a file.
 * Writes to a temp file first, then renames to avoid partial writes.
 */
export function atomicWriteJson(filePath: string, data: unknown): void {
  const dir = dirname(filePath);
  ensureDir(dir);

  const tempFile = join(dir, `.tmp-${randomUUID()}.json`);
  try {
    writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    renameSync(tempFile, filePath);
  } catch (error) {
    // Clean up temp file on failure
    try {
      if (existsSync(tempFile)) {
        // Use synchronous unlink for cleanup
        const { unlinkSync } = require('node:fs');
        unlinkSync(tempFile);
      }
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Read and parse a JSON file.
 */
export function readJson<T = unknown>(filePath: string): T {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Persist data to a JSON file with optional atomic write.
 */
export function persistJson(options: PersistOptions): PersistResult {
  const { baseDir, subdir, fileName, data, atomic = true, schemaVersion } = options;

  const dir = subdir ? join(baseDir, subdir) : baseDir;
  ensureDir(dir);

  const filePath = join(dir, `${fileName}.json`);

  const dataToWrite = schemaVersion !== undefined
    ? { ...data as object, schemaVersion }
    : data;

  if (atomic) {
    atomicWriteJson(filePath, dataToWrite);
  } else {
    ensureDir(dirname(filePath));
    writeFileSync(filePath, JSON.stringify(dataToWrite, null, 2), 'utf-8');
  }

  const stats = require('node:fs').statSync(filePath);

  return {
    path: filePath,
    size: stats.size,
  };
}

/**
 * Persist multiple reports to a directory.
 * Returns array of paths for each persisted file.
 */
export function persistReports(
  baseDir: string,
  subdir: string,
  reports: Record<string, unknown>,
  atomic = true,
): string[] {
  const dir = join(baseDir, subdir);
  ensureDir(dir);

  const paths: string[] = [];

  for (const [fileName, data] of Object.entries(reports)) {
    const result = persistJson({
      baseDir,
      subdir,
      fileName,
      data,
      atomic,
    });
    paths.push(result.path);
  }

  return paths;
}

/**
 * Generate a deterministic file path for a report.
 */
export function reportPath(baseDir: string, subdir: string, fileName: string): string {
  return join(baseDir, subdir, `${fileName}.json`);
}
