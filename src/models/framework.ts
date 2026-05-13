/**
 * Framework domain models.
 *
 * TestFile and TestSuite represent the result of framework analysis.
 * FrameworkInfo describes the detected test framework and its capabilities.
 * AdapterCapabilities tells the core engine what an adapter can do.
 */

export interface TestFile {
  /** Absolute path to the test file. */
  path: string;
  /** Relative path from project root. */
  relativePath: string;
  /** Framework version detected (e.g. "1.45.0"). */
  frameworkVersion: string;
  /** Test cases declared in this file. */
  tests: TestCase[];
}

export interface TestCase {
  name: string;
  /** Line number where the test is defined. */
  line: number;
  /** Tags or annotations (e.g. ["smoke", "regression"]). */
  tags: string[];
}

export interface TestSuite {
  files: TestFile[];
  /** Total test count across all files. */
  totalTests: number;
  /** Frameworks detected across the project. */
  frameworks: Map<string, FrameworkInfo>;
}

export interface FrameworkInfo {
  name: string;
  version: string;
  /** Path to config file (e.g. playwright.config.ts). */
  configPath?: string;
  /** Root directory for test files. */
  testRoot?: string;
}

/**
 * Declares what an adapter supports.
 * Core engine uses this to decide which operations are available.
 */
export interface AdapterCapabilities {
  /** Can this adapter run tests inline? */
  canRunTests: boolean;
  /** Can this adapter extract locators statically? */
  canExtractLocators: boolean;
  /** Can this adapter capture DOM snapshots? */
  canSnapshot: boolean;
  /** Supported locator strategies. */
  supportedStrategies: string[];
}
