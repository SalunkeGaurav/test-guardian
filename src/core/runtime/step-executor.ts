/**
 * Deterministic Step Executor
 *
 * Translates canonical ReplaySteps into browser actions via the BrowserEngine.
 * Supports: goto, click, fill, press, select, wait.
 *
 * Each action is executed exactly once. No retries. No adaptation.
 * Strict step ordering is preserved.
 */

import type { Result } from '../../models/result.js';
import type { ReplayStep } from '../../models/replay.js';
import type { InteractionResult, NavigationResult } from '../../models/runtime.js';
import { success, failure } from '../../models/result.js';
import type { BrowserEngine } from './browser.js';
import type { BrowserContextState } from '../../models/runtime.js';

export interface StepExecutionResult {
  success: boolean;
  actionType: string;
  timing: number;
  navigationResult?: NavigationResult;
  interactionResult?: InteractionResult;
  error?: string;
}

export class StepExecutor {
  constructor(private readonly browser: BrowserEngine) {}

  /**
   * Execute a single replay step against the browser.
   * The step's locatorRef provides the strategy + value pair.
   * For healing validation, overrideLocator can replace the step's locator.
   */
  async executeStep(
    step: ReplayStep,
    context: BrowserContextState,
    overrideLocator?: { strategy: string; value: string },
  ): Promise<Result<StepExecutionResult>> {
    const strategy = overrideLocator?.strategy ?? step.locatorRef?.strategy ?? 'css';
    const value = overrideLocator?.value ?? step.locatorRef?.value ?? '';

    const startTime = performance.now();

    try {
      switch (step.actionType) {
        case 'goto':
          return await this.executeGoto(step, context);

        case 'click':
          return await this.executeClick(context, strategy, value, startTime);

        case 'fill': {
          const text = extractInputValue(step);
          return await this.executeFill(context, strategy, value, text, startTime);
        }

        case 'press': {
          const key = extractInputValue(step) || 'Enter';
          return await this.executePress(context, strategy, value, key, startTime);
        }

        case 'select': {
          const option = extractInputValue(step) || '';
          return await this.executeSelect(context, strategy, value, option, startTime);
        }

        case 'wait': {
          const timeout = extractWaitTimeout(step);
          return await this.executeWait(context, timeout, startTime);
        }

        default:
          const timing = Math.round(performance.now() - startTime);
          return success({
            success: false,
            actionType: step.actionType,
            timing,
            error: `Unsupported action type: ${step.actionType}`,
          });
      }
    } catch (err) {
      const timing = Math.round(performance.now() - startTime);
      return success({
        success: false,
        actionType: step.actionType,
        timing,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  private async executeGoto(step: ReplayStep, context: BrowserContextState): Promise<Result<StepExecutionResult>> {
    const url = step.pageUrl || step.navigationContext?.url || '';
    if (!url) {
      return success({ success: false, actionType: 'goto', timing: 0, error: 'No URL provided' });
    }

    const result = await this.browser.goto(context, url);
    if (!result.ok) {
      return success({
        success: false,
        actionType: 'goto',
        timing: 0,
        error: result.error,
      });
    }

    return success({
      success: true,
      actionType: 'goto',
      timing: result.value.timing,
      navigationResult: result.value,
    });
  }

  private async executeClick(
    context: BrowserContextState,
    strategy: string,
    value: string,
    startTime: number,
  ): Promise<Result<StepExecutionResult>> {
    const result = await this.browser.click(context, strategy, value);
    if (!result.ok) {
      return success({
        success: false,
        actionType: 'click',
        timing: Math.round(performance.now() - startTime),
        error: result.error,
      });
    }

    return success({
      success: result.value.success,
      actionType: 'click',
      timing: result.value.timing,
      interactionResult: result.value,
    });
  }

  private async executeFill(
    context: BrowserContextState,
    strategy: string,
    value: string,
    text: string,
    startTime: number,
  ): Promise<Result<StepExecutionResult>> {
    const result = await this.browser.fill(context, strategy, value, text);
    if (!result.ok) {
      return success({
        success: false,
        actionType: 'fill',
        timing: Math.round(performance.now() - startTime),
        error: result.error,
      });
    }

    return success({
      success: result.value.success,
      actionType: 'fill',
      timing: result.value.timing,
      interactionResult: result.value,
    });
  }

  private async executePress(
    context: BrowserContextState,
    strategy: string,
    value: string,
    key: string,
    startTime: number,
  ): Promise<Result<StepExecutionResult>> {
    const result = await this.browser.press(context, strategy, value, key);
    if (!result.ok) {
      return success({
        success: false,
        actionType: 'press',
        timing: Math.round(performance.now() - startTime),
        error: result.error,
      });
    }

    return success({
      success: result.value.success,
      actionType: 'press',
      timing: result.value.timing,
      interactionResult: result.value,
    });
  }

  private async executeSelect(
    context: BrowserContextState,
    strategy: string,
    value: string,
    option: string,
    startTime: number,
  ): Promise<Result<StepExecutionResult>> {
    const result = await this.browser.select(context, strategy, value, option);
    if (!result.ok) {
      return success({
        success: false,
        actionType: 'select',
        timing: Math.round(performance.now() - startTime),
        error: result.error,
      });
    }

    return success({
      success: result.value.success,
      actionType: 'select',
      timing: result.value.timing,
      interactionResult: result.value,
    });
  }

  private async executeWait(
    context: BrowserContextState,
    timeout: number,
    startTime: number,
  ): Promise<Result<StepExecutionResult>> {
    const result = await this.browser.wait(context, timeout);
    if (!result.ok) {
      return success({
        success: false,
        actionType: 'wait',
        timing: Math.round(performance.now() - startTime),
        error: result.error,
      });
    }

    return success({
      success: true,
      actionType: 'wait',
      timing: timeout,
    });
  }
}

function extractInputValue(step: ReplayStep): string {
  if (!step.inputPayload) return '';
  if (typeof step.inputPayload === 'string') return step.inputPayload;
  if (typeof step.inputPayload === 'object') {
    const obj = step.inputPayload as Record<string, unknown>;
    return (obj.text as string) ?? (obj.key as string) ?? (obj.option as string) ?? '';
  }
  return '';
}

function extractWaitTimeout(step: ReplayStep): number {
  if (!step.inputPayload) return 1000;
  if (typeof step.inputPayload === 'number') return step.inputPayload;
  if (typeof step.inputPayload === 'string') {
    const n = parseInt(step.inputPayload, 10);
    return isNaN(n) ? 1000 : n;
  }
  return 1000;
}
