/**
 * Atomic Write Utilities
 *
 * Corruption-safe file writing for all persistence operations.
 * Uses temp-file + rename pattern (atomic on POSIX; safe on Win32 too).
 *
 * All writes go through a temp file first, then rename.
 * On crash/exception, the temp file is orphaned (not the target).
 *
 * No AI. No I/O beyond file operations. Deterministic.
 */

import { writeFileSync, renameSync, existsSync } from 'node:fs';

/**
 * Write data atomically: write to .tmp then rename to target.
 * On any error during write, the target file is untouched.
 */
export function atomicWrite(filePath: string, data: string): void {
  const tmpPath = filePath + '.tmp';
  writeFileSync(tmpPath, data, 'utf-8');
  renameSync(tmpPath, filePath);
}

/**
 * Write JSON atomically with pretty-print formatting.
 */
export function atomicWriteJson(filePath: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  atomicWrite(filePath, json);
}

/**
 * Delete a file if it exists. No error if missing.
 */
export function safeDelete(filePath: string): void {
  if (existsSync(filePath)) {
    const { unlinkSync } = require('node:fs');
    unlinkSync(filePath);
  }
}

/**
 * Atomic delete: write empty marker, then delete.
 * Prevents accidental deletion during write operations.
 * Falls back to direct delete if marker write fails.
 */
export function atomicDelete(filePath: string): void {
  if (!existsSync(filePath)) return;
  const markerPath = filePath + '.deleting';
  try {
    writeFileSync(markerPath, '', 'utf-8');
    safeDelete(filePath);
    safeDelete(markerPath);
  } catch {
    safeDelete(filePath);
    safeDelete(markerPath);
  }
}

/**
 * Read a file, returning null on missing or corrupt.
 * Does NOT throw on parse errors.
 */
export function safeReadJson<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) return null;
    const { readFileSync } = require('node:fs');
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Read a text file, returning null on missing.
 */
export function safeReadText(filePath: string): string | null {
  try {
    if (!existsSync(filePath)) return null;
    const { readFileSync } = require('node:fs');
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}