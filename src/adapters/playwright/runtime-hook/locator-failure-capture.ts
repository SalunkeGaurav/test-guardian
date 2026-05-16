/**
 * Locator Failure Capture
 *
 * Captures Playwright locator failures during real execution
 * and builds FailureContext for the healing pipeline.
 *
 * Reuses FailureContext from existing runtime-healing-loop/types.
 *
 * @module locator-failure-capture
 */

import type { Locator } from '../../../models/locator.js';
import type { ElementNode } from '../../../models/snapshot.js';
import type { FailureContext } from '../../../core/runtime-healing-loop/types.js';
import type { LocatorFailureInfo } from './types.js';

let failureCounter = 0;
function nextFailureId(): string {
  failureCounter++;
  return `failure-${failureCounter}`;
}

/**
 * Parse a Playwright error message to extract the failed locator expression.
 */
export function parseFailedLocator(errorMessage: string): string {
  const match = errorMessage.match(/locator\(['"]([^'"]+)['"]\)/);
  if (match) return match[1];

  const getByRoleMatch = errorMessage.match(/getByRole\(['"]([^'"]+)['"]/);
  if (getByRoleMatch) return `getByRole('${getByRoleMatch[1]}')`;

  const getByTextMatch = errorMessage.match(/getByText\(['"]([^'"]+)['"]/);
  if (getByTextMatch) return `getByText('${getByTextMatch[1]}')`;

  const getByTestIdMatch = errorMessage.match(/getByTestId\(['"]([^'"]+)['"]/);
  if (getByTestIdMatch) return `getByTestId('${getByTestIdMatch[1]}')`;

  return 'unknown';
}

/**
 * Parse a stack trace to extract file and line number.
 */
export function parseStackTrace(stackTrace: string): { file: string; line: number } {
  const lines = stackTrace.split('\n');
  for (const line of lines) {
    const match = line.match(/at\s+(?:.+?\s+)?\((.+?):(\d+):\d+\)/);
    if (match) {
      return { file: match[1], line: parseInt(match[2], 10) };
    }
    const match2 = line.match(/at\s+(.+?):(\d+):\d+/);
    if (match2 && !match2[1].includes('node_modules')) {
      return { file: match2[1], line: parseInt(match2[2], 10) };
    }
  }
  return { file: 'unknown', line: 0 };
}

/**
 * Capture a locator failure and build a FailureContext.
 */
export function captureLocatorFailure(info: LocatorFailureInfo): FailureContext {
  const failedLocatorExpression = parseFailedLocator(info.errorMessage);
  const stackInfo = parseStackTrace(info.stackTrace);

  return {
    id: nextFailureId(),
    locator: info.locator,
    failedLocatorExpression,
    stackTrace: info.stackTrace,
    failingFile: stackInfo.file !== 'unknown' ? stackInfo.file : info.failingFile,
    failingLine: stackInfo.line !== 0 ? stackInfo.line : info.failingLine,
    domSnapshot: info.domSnapshot,
    replaySessionRef: '',
    errorMessage: info.errorMessage,
    capturedAt: 0,
  };
}

/**
 * Determine if a Playwright error is a locator failure that can be healed.
 *
 * Supported failure types:
 * - Element not found (timeout waiting for locator)
 * - Element not visible
 * - Element not interactable
 * - Multiple elements matching selector
 *
 * Unsupported failure types (passthrough):
 * - Network errors
 * - Browser crashes
 * - JavaScript errors in page
 * - Permission errors
 */
export function isHealableLocatorFailure(errorMessage: string): boolean {
  const healablePatterns = [
    /Timed out.*waiting for locator/,
    /locator resolved to 0 elements/,
    /element is not visible/,
    /element is not interactable/,
    /strict mode violation.*resolved to \d+ elements/,
    /Error: locator/,
    /TimeoutError.*locator/,
  ];

  for (const pattern of healablePatterns) {
    if (pattern.test(errorMessage)) {
      return true;
    }
  }

  return false;
}
