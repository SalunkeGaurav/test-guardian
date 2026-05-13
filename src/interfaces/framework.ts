/**
 * FrameworkAdapter — contract between core engine and test frameworks.
 *
 * Every external framework (Playwright, Selenium, Cypress) must implement
 * this interface. The core engine never imports framework-specific code.
 *
 * Communication flow:
 *   1. Core calls detect() to check if this adapter applies
 *   2. Core calls discoverTests() to index the project
 *   3. Core calls extractLocators() to build the locator index
 *   4. Core calls runTest() wrapped by Tracer to capture traces
 *   5. Core calls executeStep() during replay for validation
 *
 * All methods return Result<T, E> — adapters do not throw.
 */

import type { Result } from '../models/result.js';
import type { TestFile, AdapterCapabilities } from '../models/framework.js';
import type { ExecutionTrace } from '../models/trace.js';
import type { Locator } from '../models/locator.js';
import type { NavigationStep } from '../models/navigation.js';
import type { DomSnapshot } from '../models/snapshot.js';

export interface FrameworkAdapter {
  /** Unique name (e.g. "playwright", "selenium", "cypress"). */
  readonly name: string;

  /** Declare capabilities so the core engine knows what's available. */
  readonly capabilities: AdapterCapabilities;

  /** Detect whether this adapter applies to the given project root. */
  detect(projectRoot: string): Result<boolean>;

  /** Discover all test files in the project. */
  discoverTests(projectRoot: string): Result<TestFile[]>;

  /** Extract locator records from a test file (static analysis). */
  extractLocators(filePath: string): Result<Locator[]>;

  /** Run a single test and return an execution trace. */
  runTest(filePath: string, testName?: string): Promise<Result<ExecutionTrace>>;

  /** Execute a single navigation step during replay. */
  executeStep(step: NavigationStep): Promise<Result<DomSnapshot>>;

  /** Capture a DOM snapshot of the current page state. */
  captureSnapshot(): Promise<Result<DomSnapshot>>;
}

/**
 * Adapter lifecycle hooks for the Tracer module.
 * Allows adapters to inject custom tracing behavior.
 */
export interface AdapterHooks {
  /** Called before test execution starts. */
  onTestStart?(testFile: string, testName: string): Promise<void>;
  /** Called after each trace event is captured. */
  onEvent?(event: unknown): Promise<void>;
  /** Called when test execution finishes. */
  onTestEnd?(trace: ExecutionTrace): Promise<void>;
}
