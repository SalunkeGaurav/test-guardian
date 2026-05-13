/**
 * LocatorIndexProvider — contract for reading/writing the locator index.
 *
 * Implemented by the storage module. Consumed by the analyzer, healing engine,
 * and validator.
 */

import type { Result } from '../models/result.js';
import type { Locator, LocatorIndexEntry, LocatorStrategy } from '../models/locator.js';

export interface LocatorIndexProvider {
  /** Get a single locator by its stable hash. */
  getById(id: string): Promise<Result<LocatorIndexEntry>>;
  /** Find locators by strategy type. */
  getByStrategy(strategy: LocatorStrategy): Promise<Result<LocatorIndexEntry[]>>;
  /** Find locators in a specific source file. */
  getByFile(filePath: string): Promise<Result<LocatorIndexEntry[]>>;
  /** Register a locator in the index (updates if exists). */
  upsert(locator: Locator): Promise<Result<void>>;
  /** Mark a locator as verified (resolved successfully). */
  markVerified(id: string): Promise<Result<void>>;
  /** Mark a locator as failed (did not resolve). */
  markFailed(id: string): Promise<Result<void>>;
  /** Export the full index (for serialization). */
  exportAll(): Promise<Result<LocatorIndexEntry[]>>;
}
