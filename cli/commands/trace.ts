/**
 * trace — Run tests and capture execution traces.
 *
 * Flow:
 *   1. For each file, call Tracer.trace()
 *   2. Tracer wraps adapter.runTest() with instrumentation
 *   3. On failure, adapter.captureSnapshot() stores DOM state
 *   4. Trace is persisted via StorageProvider.saveTrace()
 *   5. Locator index is updated (success/failure counts)
 *
 * Delegates to: Tracer, StorageProvider
 */

export async function trace(files: string[], testName?: string): Promise<void> {
  // 1. Resolve test files (glob if not specified)
  // 2. For each file, run tracer.trace()
  // 3. Print trace summary
  console.log(`Tracing ${files.length} file(s)...`, testName ? `(test: ${testName})` : '');
}
