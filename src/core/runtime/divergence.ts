/**
 * Replay Divergence Detection
 *
 * Detects unexpected differences between the recorded replay session
 * and the actual runtime execution:
 * - Unexpected URL changes
 * - Missing expected elements
 * - Failed interactions
 * - Modal/dialog state mismatch
 * - Frame mismatch
 * - DOM inconsistency
 *
 * Deterministic rule-based checks. No AI. No heuristics.
 */

import type { ReplayStep } from '../../models/replay.js';
import type { StepExecutionResult } from './step-executor.js';
import type { ReplayDivergence, RuntimeEvidence } from '../../models/runtime.js';

export class DivergenceDetector {
  /**
   * Detect divergences between a replayed step and the recorded expectation.
   */
  detect(
    step: ReplayStep,
    executionResult: StepExecutionResult,
    evidence: RuntimeEvidence,
    previousUrl: string,
  ): ReplayDivergence[] {
    const divergences: ReplayDivergence[] = [];

    // Check for interaction failures
    if (!executionResult.success) {
      divergences.push({
        type: 'interaction-failed',
        stepIndex: 0, // set by caller
        expected: `${step.actionType} should succeed`,
        actual: executionResult.error ?? 'Unknown error',
      });
    }

    // Check for unexpected URL changes (only for non-goto steps)
    if (step.actionType !== 'goto' && evidence.navigationChanged) {
      const expectedUrl = step.pageUrl || previousUrl;
      if (evidence.url !== expectedUrl) {
        divergences.push({
          type: 'url-mismatch',
          stepIndex: 0,
          expected: expectedUrl,
          actual: evidence.url,
        });
      }
    }

    // Check for missing elements (interaction-based steps)
    if (step.locatorRef && executionResult.interactionResult && !executionResult.interactionResult.success) {
      divergences.push({
        type: 'element-missing',
        stepIndex: 0,
        expected: `Element ${step.locatorRef.strategy}="${step.locatorRef.value}"`,
        actual: executionResult.interactionResult.error ?? 'Element not found or not interactable',
      });
    }

    // Check for dialog state mismatches
    if (step.navigationContext?.dialog !== undefined) {
      const expectedDialog = step.navigationContext.dialog;
      const actualDialog = evidence.url.includes('alert') || evidence.url.includes('confirm'); // heuristic
      if (expectedDialog && !actualDialog) {
        divergences.push({
          type: 'dialog-mismatch',
          stepIndex: 0,
          expected: 'Dialog present',
          actual: 'No dialog detected',
        });
      }
    }

    // Check for frame mismatches
    if (step.navigationContext?.frame) {
      const expectedFrame = step.navigationContext.frame;
      if (evidence.url !== step.pageUrl) {
        divergences.push({
          type: 'frame-mismatch',
          stepIndex: 0,
          expected: `Frame: ${expectedFrame}`,
          actual: `URL changed to ${evidence.url}`,
        });
      }
    }

    // Check for console errors as DOM inconsistency indicators
    if (evidence.consoleErrors.length > 0) {
      divergences.push({
        type: 'dom-inconsistency',
        stepIndex: 0,
        expected: 'No console errors',
        actual: `Console errors: ${evidence.consoleErrors.join('; ')}`,
      });
    }

    return divergences;
  }

  /**
   * Check if two URLs are equivalent (ignoring hash, trailing slash differences).
   */
  urlsMatch(a: string, b: string): boolean {
    const normalize = (url: string) => {
      try {
        const parsed = new URL(url);
        parsed.hash = '';
        let path = parsed.pathname.replace(/\/+$/, '');
        return `${parsed.origin}${path}${parsed.search}`;
      } catch {
        return url.replace(/\/+$/, '');
      }
    };
    return normalize(a) === normalize(b);
  }
}
