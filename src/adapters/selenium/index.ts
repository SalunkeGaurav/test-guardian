/**
 * Selenium Adapter
 *
 * Implements FrameworkAdapter for Selenium/WebDriver projects.
 * Detection: looks for selenium-webdriver dependency in package.json.
 *
 * @implements {FrameworkAdapter}
 */

import type { FrameworkAdapter } from '../../interfaces/framework.js';
import type { Result } from '../../models/result.js';
import type { TestFile, AdapterCapabilities } from '../../models/framework.js';
import type { Locator } from '../../models/locator.js';
import type { ExecutionTrace } from '../../models/trace.js';
import type { NavigationStep } from '../../models/navigation.js';
import type { DomSnapshot } from '../../models/snapshot.js';

export const capabilities: AdapterCapabilities = {
  canRunTests: true,
  canExtractLocators: true,
  canSnapshot: false,
  supportedStrategies: ['css', 'xpath', 'id', 'class-name', 'name', 'tag', 'text', 'aria-label'],
};

export class SeleniumAdapter implements FrameworkAdapter {
  readonly name = 'selenium';
  readonly capabilities = capabilities;

  detect(projectRoot: string): Result<boolean> {
    throw new Error('Not implemented');
  }

  discoverTests(projectRoot: string): Result<TestFile[]> {
    throw new Error('Not implemented');
  }

  extractLocators(filePath: string): Result<Locator[]> {
    throw new Error('Not implemented');
  }

  async runTest(filePath: string, testName?: string): Promise<Result<ExecutionTrace>> {
    throw new Error('Not implemented');
  }

  async executeStep(step: NavigationStep): Promise<Result<DomSnapshot>> {
    throw new Error('Not implemented');
  }

  async captureSnapshot(): Promise<Result<DomSnapshot>> {
    throw new Error('Not implemented');
  }
}
