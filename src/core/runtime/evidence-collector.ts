/**
 * Runtime Evidence Collector
 *
 * Captures deterministic evidence at each step of replay execution:
 * - Matched runtime element (tag, attributes, text, visibility, interactability)
 * - Visibility and interactability state
 * - Navigation changes (URL transitions)
 * - Console errors
 * - Timing information
 * - Optional screenshot references
 *
 * Pure collection — no analysis, no scoring.
 */

import type { ReplayStep } from '../../models/replay.js';
import type { RuntimeEvidence, MatchedElement, BrowserContextState } from '../../models/runtime.js';
import type { StepExecutionResult } from './step-executor.js';
import type { BrowserEngine } from './browser.js';

export class EvidenceCollector {
  constructor(private readonly browser: BrowserEngine) {}

  /**
   * Collect runtime evidence for a single executed step.
   */
  async collect(
    step: ReplayStep,
    executionResult: StepExecutionResult,
    context: BrowserContextState,
    previousUrl: string,
  ): Promise<RuntimeEvidence> {
    const [currentUrl, consoleErrors] = await Promise.all([
      this.browser.getCurrentUrl(context).catch(() => ''),
      this.browser.getConsoleErrors(context).catch(() => [] as string[]),
    ]);

    const matchedElement = executionResult.interactionResult?.matchedElement;

    // Goto and wait steps are non-interaction — default to interactable
    const isInteractionStep = ['click', 'fill', 'press', 'select'].includes(step.actionType);

    return {
      stepIndex: 0, // set by caller
      actionType: step.actionType,
      matchedElement,
      interactable: isInteractionStep ? (matchedElement?.interactable ?? false) : true,
      visible: isInteractionStep ? (matchedElement?.visible ?? false) : true,
      navigationChanged: currentUrl !== previousUrl,
      url: currentUrl,
      timing: executionResult.timing,
      consoleErrors,
    };
  }

  /**
   * Build a MatchedElement from raw element data collected via the browser.
   */
  buildMatchedElement(
    tagName: string,
    attributes: Record<string, string>,
    visible: boolean,
    interactable: boolean,
    textContent?: string,
    boundingBox?: { x: number; y: number; width: number; height: number },
  ): MatchedElement {
    return {
      tagName,
      attributes,
      textContent,
      visible,
      interactable,
      boundingBox,
    };
  }
}
