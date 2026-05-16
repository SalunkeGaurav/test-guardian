/**
 * Replay Drift Detection
 *
 * Detects navigation divergence, selector drift, timing-induced instability,
 * action sequence divergence, and replay nondeterminism.
 *
 * Generates ReplayDriftReport.
 *
 * No AI. No timing sleeps. Deterministic replay comparison.
 */

import type { ElementNode } from '../../models/snapshot.js';
import type { ReplaySession, ReplayStep } from '../../models/replay.js';
import type {
  ReplayDriftReport,
  ReplayDriftEvent,
  DriftType,
} from './types.js';

function flattenDom(root: ElementNode): Map<string, ElementNode> {
  const map = new Map<string, ElementNode>();
  const walk = (node: ElementNode, path: string): void => {
    map.set(path, node);
    node.children.forEach((child, i) => {
      walk(child, `${path}/${child.tagName}[${i}]`);
    });
  };
  walk(root, `/${root.tagName}`);
  return map;
}

export class ReplayDriftDetector {
  analyze(
    sessionId: string,
    session: ReplaySession,
    domSnapshots: ElementNode[],
  ): ReplayDriftReport {
    const events: ReplayDriftEvent[] = [];

    for (let i = 0; i < session.steps.length; i++) {
      const step = session.steps[i]!;
      const snapshot = domSnapshots[i];

      const navDivergence = this.detectNavigationDivergence(step, session, i);
      if (navDivergence) events.push(navDivergence);

      if (snapshot) {
        const selectorDrift = this.detectSelectorDrift(step, snapshot);
        if (selectorDrift) events.push(selectorDrift);

        const timingDrift = this.detectTimingInstability(step, i);
        if (timingDrift) events.push(timingDrift);
      }

      const actionDrift = this.detectActionSequenceDivergence(step, session, i);
      if (actionDrift) events.push(actionDrift);
    }

    const nondeterministicReplays = this.detectNondeterministicReplay(session, events);

    const navigationDivergences = events.filter(e => e.type === 'navigation-divergence').length;
    const selectorDriftCount = events.filter(e => e.type === 'selector-drift').length;
    const timingInstabilityCount = events.filter(e => e.type === 'timing-instability').length;
    const actionSequenceDivergences = events.filter(e => e.type === 'action-sequence-divergence').length;

    const driftSeverity = this.computeSeverity(events);
    const replayDeterministic = events.length === 0;

    return {
      sessionId,
      events,
      totalDriftEvents: events.length,
      navigationDivergences,
      selectorDriftCount,
      timingInstabilityCount,
      actionSequenceDivergences,
      nondeterministicReplays,
      driftSeverity,
      replayDeterministic,
      detectedAt: session.createdAt,
    };
  }

  private detectNavigationDivergence(
    step: ReplayStep,
    session: ReplaySession,
    stepIndex: number,
  ): ReplayDriftEvent | null {
    const expectedUrl = session.entryUrl;
    const actualUrl = step.pageUrl;

    if (!expectedUrl || !actualUrl) return null;

    if (step.result.success && actualUrl !== expectedUrl) {
      const expectedOrigin = this.extractOrigin(expectedUrl);
      const actualOrigin = this.extractOrigin(actualUrl);

      if (expectedOrigin !== actualOrigin) {
        return {
          type: 'navigation-divergence',
          stepIndex,
          expected: expectedUrl,
          actual: actualUrl,
          severity: 'high',
        };
      }

      const expectedPath = this.extractPath(expectedUrl);
      const actualPath = this.extractPath(actualUrl);

      if (expectedPath !== actualPath) {
        return {
          type: 'navigation-divergence',
          stepIndex,
          expected: expectedUrl,
          actual: actualUrl,
          severity: 'high',
        };
      }
    }

    if (!step.result.success && step.result.error?.includes('navigation')) {
      return {
        type: 'navigation-divergence',
        stepIndex,
        expected: expectedUrl,
        actual: step.result.error,
        severity: 'critical',
      };
    }

    return null;
  }

  private detectSelectorDrift(
    step: ReplayStep,
    snapshot: ElementNode,
  ): ReplayDriftEvent | null {
    const locatorRef = step.locatorRef;
    if (!locatorRef) return null;

    const flat = flattenDom(snapshot);
    const resolved = this.resolveExpression(locatorRef.expression, flat);

    if (!resolved && step.result.success) {
      return {
        type: 'selector-drift',
        stepIndex: 0,
        expected: locatorRef.expression,
        actual: 'element not found in snapshot',
        severity: 'medium',
      };
    }

    if (resolved && !step.result.success) {
      return {
        type: 'selector-drift',
        stepIndex: 0,
        expected: 'element found',
        actual: 'step failed despite element presence',
        severity: 'high',
      };
    }

    return null;
  }

  private detectTimingInstability(
    step: ReplayStep,
    stepIndex: number,
  ): ReplayDriftEvent | null {
    if (!step.result.success) return null;

    const duration = step.result.duration;
    if (duration > 5000) {
      return {
        type: 'timing-instability',
        stepIndex,
        expected: 'duration < 5000ms',
        actual: `duration ${duration}ms`,
        severity: 'low',
      };
    }

    return null;
  }

  private detectActionSequenceDivergence(
    step: ReplayStep,
    session: ReplaySession,
    stepIndex: number,
  ): ReplayDriftEvent | null {
    if (stepIndex === 0) return null;

    const prevStep = session.steps[stepIndex - 1];
    if (!prevStep) return null;

    const expectedAction = this.expectedNextAction(prevStep);
    const actualAction = step.actionType;

    if (expectedAction && actualAction !== expectedAction) {
      return {
        type: 'action-sequence-divergence',
        stepIndex,
        expected: expectedAction,
        actual: actualAction,
        severity: 'medium',
      };
    }

    return null;
  }

  private detectNondeterministicReplay(
    _session: ReplaySession,
    events: ReplayDriftEvent[],
  ): number {
    const hasDivergentFailures = events.some(
      e => e.type === 'navigation-divergence' && e.severity === 'critical',
    );

    const hasSelectorInconsistency = events.some(
      e => e.type === 'selector-drift' && e.severity === 'high',
    );

    let count = 0;
    if (hasDivergentFailures) count++;
    if (hasSelectorInconsistency) count++;

    return count;
  }

  private computeSeverity(events: ReplayDriftEvent[]): ReplayDriftReport['driftSeverity'] {
    if (events.length === 0) return 'none';

    const hasCritical = events.some(e => e.severity === 'critical');
    const hasHigh = events.some(e => e.severity === 'high');
    const hasMedium = events.some(e => e.severity === 'medium');

    if (hasCritical) return 'critical';
    if (hasHigh) return 'high';
    if (hasMedium) return 'medium';
    return 'low';
  }

  private expectedNextAction(prevStep: ReplayStep): string | null {
    switch (prevStep.actionType) {
      case 'goto':
        return 'click';
      case 'click':
        return 'fill';
      case 'fill':
        return 'click';
      default:
        return null;
    }
  }

  private resolveExpression(
    expression: string,
    flatMap: Map<string, ElementNode>,
  ): string | null {
    for (const [path, node] of flatMap) {
      if (this.nodeMatchesExpression(node, expression)) {
        return path;
      }
    }
    return null;
  }

  private nodeMatchesExpression(node: ElementNode, expression: string): boolean {
    if (node.attributes['id'] && expression === `#${node.attributes['id']}`) return true;
    if (node.attributes['data-testid'] && expression.includes(node.attributes['data-testid'])) return true;
    if (node.attributes['aria-label'] && expression.includes(node.attributes['aria-label'])) return true;
    if (node.attributes['role'] && expression.includes(node.attributes['role'])) return true;
    if (node.tagName.toLowerCase() === expression.toLowerCase()) return true;
    return false;
  }

  private extractOrigin(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.origin;
    } catch {
      return url.split('/')[0] ?? url;
    }
  }

  private extractPath(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      const parts = url.split('/');
      return parts.slice(2).join('/');
    }
  }
}
