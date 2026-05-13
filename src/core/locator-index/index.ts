/**
 * Locator Index Module
 *
 * Purpose: Maintain a searchable, deduplicated index of all locators
 * discovered across the project. Tracks success/failure history per locator.
 *
 * Inputs:
 *   - Locator[] from analyzer
 *   - ExecutionTrace events from tracer (to update success/failure counts)
 *
 * Outputs:
 *   - LocatorIndex (searchable by hash, file, strategy)
 *
 * Used by: Healing engine (to find candidates), validator (to verify), CLI
 *
 * Boundary:
 *   - Pure data management — no I/O except through LocatorIndexProvider
 *   - No knowledge of how locators are extracted or used
 *   - Deduplication is by stable hash of (strategy + value)
 */

import type { LocatorIndexProvider } from '../../interfaces/locator.js';
import type { Locator, LocatorIndexEntry, LocatorStrategy } from '../../models/locator.js';
import type { Result } from '../../models/result.js';

export class LocatorIndexService {
  constructor(private readonly storage: LocatorIndexProvider) {}

  async register(locators: Locator[]): Promise<Result<void>> {
    // 1. Hash each locator
    // 2. Upsert into index
    // 3. If exists, update lastSeen
    throw new Error('Not implemented');
  }

  async findByStrategy(strategy: LocatorStrategy): Promise<Result<LocatorIndexEntry[]>> {
    return this.storage.getByStrategy(strategy);
  }

  async findByFile(filePath: string): Promise<Result<LocatorIndexEntry[]>> {
    return this.storage.getByFile(filePath);
  }
}
