import type { FrameworkAdapter } from '../../interfaces/framework.js';
import type { TraceProvider } from '../../interfaces/execution.js';
import type { ExecutionTrace } from '../../models/trace.js';
import type { Result } from '../../models/result.js';
import { info, warn } from '../../logger/index.js';

export class Tracer {
  constructor(
    private readonly adapter: FrameworkAdapter,
    private readonly storage: TraceProvider,
  ) {}

  async trace(filePath: string, testName?: string): Promise<Result<ExecutionTrace>> {
    info('tracer', `Tracing ${filePath}${testName ? ` (test: ${testName})` : ''}`);

    if (!this.adapter.capabilities.canRunTests) {
      return {
        ok: false,
        error: `${this.adapter.name} adapter does not support runtime execution. Use the fixture-based approach: import { test } from 'testguardian/src/adapters/${this.adapter.name}/tracer/fixture.js'`,
      };
    }

    const result = await this.adapter.runTest(filePath, testName);

    if (!result.ok) {
      warn('tracer', `Execution failed: ${result.error}`);
      return result;
    }

    const trace = result.value;
    const persistResult = await this.storage.save(trace);

    if (!persistResult.ok) {
      warn('tracer', `Failed to persist trace: ${persistResult.error}`);
    }

    info('tracer', `Trace ${trace.id}: ${trace.passed ? 'PASS' : 'FAIL'} (${trace.events.length} events, ${trace.duration}ms)`);
    return { ok: true, value: trace };
  }
}
