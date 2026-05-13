/**
 * Tracer Module
 *
 * Purpose: Hook into test execution, capture structured trace events,
 * and persist ExecutionTrace records for later analysis.
 *
 * The tracer wraps FrameworkAdapter.runTest() and injects instrumentation
 * to capture every navigation, click, type, assertion, and error.
 *
 * Inputs:
 *   - FrameworkAdapter instance
 *   - Test file path + optional test name
 *
 * Outputs:
 *   - ExecutionTrace (persisted to .testguardian/traces/)
 *
 * Used by: CLI `trace` command, healing engine (to get failing traces)
 *
 * Boundary:
 *   - Calls adapter.runTest() with instrumentation hooks
 *   - Captures DOM snapshots on failure via adapter.captureSnapshot()
 *   - Persists traces via TraceProvider
 *   - No knowledge of healing or patching
 */

import type { FrameworkAdapter } from '../../interfaces/framework.js';
import type { TraceProvider } from '../../interfaces/execution.js';
import type { ExecutionTrace } from '../../models/trace.js';
import type { Result } from '../../models/result.js';

export class Tracer {
  constructor(
    private readonly adapter: FrameworkAdapter,
    private readonly storage: TraceProvider,
  ) {}

  async trace(filePath: string, testName?: string): Promise<Result<ExecutionTrace>> {
    // 1. Adapter exécutes the test
    // 2. Every action is recorded as a TraceEvent
    // 3. On failure, capture DOM snapshot via adapter
    // 4. Persist the trace
    // 5. Return the trace
    throw new Error('Not implemented');
  }
}
