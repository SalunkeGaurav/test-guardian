/**
 * FailureCapture
 *
 * Captures a runtime Playwright test failure into a deterministic
 * FailureContext for downstream healing processing.
 *
 * No AI. No browser execution. Pure data extraction.
 */

import type { Locator } from '../../models/locator.js';
import type { ElementNode } from '../../models/snapshot.js';
import type { ReplaySession } from '../../models/replay.js';
import type { FailureContext } from './types.js';

let counter = 0;
function nextId(): string {
  counter++;
  return `failure-${counter}`;
}

export interface FailureInput {
  locator: Locator;
  failedLocatorExpression: string;
  stackTrace: string;
  failingFile: string;
  failingLine: number;
  domSnapshot: ElementNode[];
  replaySession?: ReplaySession;
  errorMessage: string;
}

export class FailureCapture {
  /**
   * Capture a Playwright test failure into a structured FailureContext.
   */
  capture(input: FailureInput): FailureContext {
    return {
      locator: input.locator,
      failedLocatorExpression: input.failedLocatorExpression,
      stackTrace: input.stackTrace,
      failingFile: input.failingFile,
      failingLine: input.failingLine,
      domSnapshot: input.domSnapshot,
      replaySessionRef: input.replaySession?.id ?? 'none',
      replaySession: input.replaySession,
      errorMessage: input.errorMessage,
      capturedAt: input.replaySession?.createdAt ?? 0,
    };
  }

  /**
   * Parse a Playwright error message to extract the failed locator expression.
   */
  static parseFailedLocator(errorMessage: string): string {
    const patterns = [
      /locator\((["'])(.*?)\1\)/,
      /getBy\w+\((["'])(.*?)\1\)/,
      /page\.\w+\((["'])(.*?)\1\)/,
    ];

    for (const pattern of patterns) {
      const match = errorMessage.match(pattern);
      if (match) return match[2] ?? '';
    }

    return '';
  }

  /**
   * Parse a stack trace to extract the failing file and line.
   */
  static parseStackTrace(stackTrace: string): { file: string; line: number } {
    const lines = stackTrace.split('\n');
    for (const line of lines) {
      const match = line.match(/at\s+\S+\s+\((.*?):(\d+):\d+\)/);
      if (match) {
        return { file: match[1] ?? '', line: parseInt(match[2] ?? '0', 10) };
      }
      const match2 = line.match(/at\s+(.*?):(\d+):\d+/);
      if (match2) {
        return { file: match2[1] ?? '', line: parseInt(match2[2] ?? '0', 10) };
      }
    }
    return { file: '', line: 0 };
  }
}
