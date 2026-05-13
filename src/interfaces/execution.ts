/**
 * TraceProvider — contract for storing/retrieving execution traces.
 *
 * Implemented by the storage module. Consumed by the tracer, healing engine,
 * and replay module.
 */

import type { Result } from '../models/result.js';
import type { ExecutionTrace, TraceSummary } from '../models/trace.js';

export interface TraceProvider {
  /** Store a completed trace. */
  save(trace: ExecutionTrace): Promise<Result<void>>;
  /** Retrieve a single trace by ID. */
  getById(id: string): Promise<Result<ExecutionTrace>>;
  /** List traces for a specific test file (newest first). */
  listByFile(filePath: string, limit?: number): Promise<Result<TraceSummary[]>>;
  /** List recent traces across all files (newest first). */
  listRecent(limit?: number): Promise<Result<TraceSummary[]>>;
  /** Delete traces older than a timestamp. */
  prune(before: number): Promise<Result<number>>;
}
