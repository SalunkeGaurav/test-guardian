/**
 * ReplayModelGenerator
 *
 * Transforms raw ExecutionTrace into deterministic ReplaySession.
 * This is the core modeling transformation — it normalizes runtime
 * execution into canonical replay steps while preserving:
 *
 * - navigation context (URL transitions, redirects, frames, modals)
 * - action ordering (deterministic sequence)
 * - locator interaction history
 * - state transition metadata
 * - action type normalization
 *
 * No replay execution happens here — only modeling and normalization.
 */

import type { Result } from '../../models/result.js';
import type { ExecutionTrace, TraceEvent } from '../../models/trace.js';
import type {
  ReplaySession,
  ReplayStep,
  CanonicalActionType,
  LocatorReference,
  NavigationContext,
  StepResult,
  SnapshotReference,
  InputPayload,
} from '../../models/replay.js';
import {
  SCHEMA_VERSION,
  EVENT_TYPE_TO_ACTION,
  ACTION_TYPES_WITH_INPUT,
  ACTION_TYPES_WITH_LOCATOR,
  MAX_REDIRECT_CHAIN_LENGTH,
  MAX_URL_TRANSITIONS,
} from './schema.js';
import { failure, success } from '../../models/result.js';

// Internal counter for step ID generation.
let stepCounter = 0;

function nextStepId(): string {
  stepCounter++;
  return `step-${Date.now()}-${stepCounter}`;
}

function mapActionType(event: TraceEvent): CanonicalActionType | null {
  const mapped = EVENT_TYPE_TO_ACTION[event.type];
  if (mapped) return mapped;

  // Special cases: error/timeout events with no mapping become wait steps
  if (event.type === 'error' || event.type === 'timeout') {
    return 'wait';
  }

  return null;
}

function buildLocatorRef(event: TraceEvent): LocatorReference | undefined {
  if (!event.locator) return undefined;
  return {
    strategy: inferStrategy(event.locator, event.resolvedSelector),
    value: event.locator,
    expression: event.resolvedSelector ?? event.locator,
  };
}

function inferStrategy(locator: string, resolved?: string): string {
  if (resolved && resolved !== locator) return 'custom';
  if (locator.startsWith('#')) return 'css';
  if (locator.startsWith('.')) return 'css';
  if (locator.startsWith('//') || locator.startsWith('xpath=')) return 'xpath';
  if (locator.startsWith('text=') || locator.startsWith('"')) return 'text';
  if (locator.startsWith('role=') || locator.includes('[role=')) return 'role';
  if (locator.includes('data-testid') || locator.includes('testid=')) return 'testid';
  if (locator.startsWith('placeholder=')) return 'placeholder';
  if (locator.startsWith('label=')) return 'label';
  return 'css';
}

function buildNavigationContext(event: TraceEvent, currentUrl: string): NavigationContext {
  return {
    url: event.metadata?.url as string ?? currentUrl,
    frame: event.metadata?.frame as string | undefined,
    dialog: event.metadata?.dialog === true,
    modal: event.metadata?.modal === true,
  };
}

function buildStepResult(event: TraceEvent): StepResult {
  return {
    success: event.success,
    error: event.error,
    duration: event.duration,
    screenshotRef: event.screenshot,
  };
}

function buildSnapshotRef(event: TraceEvent): SnapshotReference | undefined {
  if (!event.domSnapshotId) return undefined;
  return {
    snapshotId: event.domSnapshotId,
    capturedAt: event.timestamp,
  };
}

function buildInputPayload(event: TraceEvent): InputPayload | undefined {
  if (!event.metadata?.inputValue) return undefined;
  return event.metadata.inputValue as InputPayload;
}

function collectUrlTransitions(events: TraceEvent[]): string[] {
  const urls: string[] = [];
  for (const event of events) {
    const url = event.metadata?.url as string | undefined;
    if (url && (urls.length === 0 || url !== urls[urls.length - 1])) {
      urls.push(url);
      if (urls.length >= MAX_URL_TRANSITIONS) break;
    }
  }
  return urls;
}

function detectRedirectChain(events: TraceEvent[]): string[] {
  const chain: string[] = [];
  for (const event of events) {
    if (event.type === 'navigation') {
      const url = event.metadata?.url as string | undefined;
      const redirectFrom = event.metadata?.redirectFrom as string | undefined;
      if (redirectFrom && !chain.includes(redirectFrom)) {
        chain.push(redirectFrom);
      }
      if (url && !chain.includes(url)) {
        chain.push(url);
      }
      if (chain.length >= MAX_REDIRECT_CHAIN_LENGTH) break;
    }
  }
  return chain;
}

function detectFrameContext(events: TraceEvent[]): string[] {
  const frames = new Set<string>();
  for (const event of events) {
    const frame = event.metadata?.frame as string | undefined;
    if (frame && frame !== 'main') frames.add(frame);
  }
  return Array.from(frames).sort();
}

function detectModalDialogContext(events: TraceEvent[]): string[] {
  const contexts: string[] = [];
  for (const event of events) {
    if (event.metadata?.dialog === true) {
      if (!contexts.includes('dialog')) contexts.push('dialog');
    }
    if (event.metadata?.modal === true) {
      if (!contexts.includes('modal')) contexts.push('modal');
    }
  }
  return contexts;
}

export class ReplayModelGenerator {

  /**
   * Transform a single ExecutionTrace into a deterministic ReplaySession.
   *
   * Returns failure if the trace has no replayable events.
   */
  generate(trace: ExecutionTrace): Result<ReplaySession> {
    const steps = this.normalizeSteps(trace);

    if (steps.length === 0) {
      return failure('No replayable events in trace');
    }

    const entryUrl = this.determineEntryUrl(trace, steps);
    const urlTransitions = collectUrlTransitions(trace.events);
    const redirectChain = detectRedirectChain(trace.events);
    const frameContext = detectFrameContext(trace.events);
    const modalDialogContext = detectModalDialogContext(trace.events);

    return success({
      id: `replay-${trace.id}`,
      traceId: trace.id,
      testName: trace.testName,
      testFile: trace.testFile,
      framework: trace.framework,
      schemaVersion: SCHEMA_VERSION,
      entryUrl,
      urlTransitions,
      redirectChain,
      frameContext,
      modalDialogContext,
      steps,
      createdAt: Date.now(),
    });
  }

  /**
   * Normalize trace events into canonical replay steps.
   * Non-deterministic events are filtered out.
   * Ordering is strictly preserved.
   */
  private normalizeSteps(trace: ExecutionTrace): ReplayStep[] {
    const steps: ReplayStep[] = [];
    let currentUrl = '';

    for (const event of trace.events) {
      const actionType = mapActionType(event);
      if (actionType === null) continue;

      const eventUrl = event.metadata?.url as string | undefined;
      if (eventUrl) currentUrl = eventUrl;

      const replayStep = this.buildStep(event, actionType, currentUrl);
      steps.push(replayStep);
    }

    return steps;
  }

  private buildStep(
    event: TraceEvent,
    actionType: CanonicalActionType,
    currentUrl: string,
  ): ReplayStep {
    const locatorRef = ACTION_TYPES_WITH_LOCATOR.has(actionType)
      ? buildLocatorRef(event)
      : undefined;

    return {
      stepId: nextStepId(),
      timestamp: event.timestamp,
      actionType,
      locatorRef,
      pageUrl: currentUrl,
      inputPayload: ACTION_TYPES_WITH_INPUT.has(actionType)
        ? buildInputPayload(event)
        : undefined,
      result: buildStepResult(event),
      snapshotRef: buildSnapshotRef(event),
      navigationContext: buildNavigationContext(event, currentUrl),
    };
  }

  private determineEntryUrl(trace: ExecutionTrace, steps: ReplayStep[]): string {
    const metaUrl = trace.metadata?.entryUrl as string | undefined;
    if (metaUrl) return metaUrl;

    const firstNav = trace.events.find(e => e.type === 'navigation');
    const firstNavUrl = firstNav?.metadata?.url as string | undefined;
    if (firstNavUrl) return firstNavUrl;

    if (steps.length > 0) return steps[0]!.pageUrl;

    return '';
  }
}
