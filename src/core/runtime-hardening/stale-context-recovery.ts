/**
 * Stale Context Recovery
 *
 * Recovers from detached DOM nodes, stale element references, invalid
 * execution contexts, and navigation-invalidated handles.
 *
 * Implements deterministic re-resolution strategy.
 *
 * No AI. No retries with random backoff. Deterministic re-resolution.
 */

import type { ElementNode } from '../../models/snapshot.js';
import type { ReplaySession, ReplayStep } from '../../models/replay.js';
import type {
  StaleContextRecoveryReport,
  StaleContextEvent,
  StaleContextType,
} from './types.js';

const STABLE_RESELECT_ATTRS = ['data-testid', 'data-test-id', 'aria-label', 'role', 'id', 'name'];

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

export class StaleContextRecovery {
  analyze(
    sessionId: string,
    session: ReplaySession,
    domSnapshots: ElementNode[],
  ): StaleContextRecoveryReport {
    const events: StaleContextEvent[] = [];

    for (let i = 0; i < session.steps.length; i++) {
      const step = session.steps[i]!;
      const locatorRef = step.locatorRef;

      if (!locatorRef) continue;

      const snapshot = domSnapshots[i];
      if (!snapshot) continue;

      const staleType = this.detectStaleContext(step, snapshot, locatorRef.expression);
      if (!staleType) continue;

      const recoverable = this.isRecoverable(staleType, locatorRef);
      const recoveryResult = recoverable
        ? this.attemptReResolution(locatorRef, snapshot)
        : { success: false, path: undefined };

      events.push({
        type: staleType,
        locatorExpression: locatorRef.expression,
        stepIndex: i,
        recoverable,
        recoveryAttempted: recoverable,
        recoverySuccess: recoveryResult.success,
        reResolutionPath: recoveryResult.path,
      });
    }

    const successfulRecoveries = events.filter(e => e.recoverySuccess).length;
    const failedRecoveries = events.length - successfulRecoveries;
    const recoveryRate = events.length > 0 ? successfulRecoveries / events.length : 1;

    return {
      sessionId,
      events,
      totalStaleEvents: events.length,
      successfulRecoveries,
      failedRecoveries,
      recoveryRate,
      recoveredAt: session.createdAt,
    };
  }

  private detectStaleContext(
    step: ReplayStep,
    snapshot: ElementNode,
    expression: string,
  ): StaleContextType | null {
    if (!step.result.success && step.result.error) {
      const error = step.result.error.toLowerCase();
      if (error.includes('detached')) return 'detached-node';
      if (error.includes('stale') || error.includes('reference')) return 'stale-element-ref';
      if (error.includes('execution context') || error.includes('context destroyed')) {
        return 'invalid-execution-context';
      }
      if (error.includes('navigation') || error.includes('navigated')) {
        return 'navigation-invalidated';
      }
    }

    const flat = flattenDom(snapshot);
    const resolved = this.resolveExpression(expression, flat);
    if (!resolved) {
      return 'detached-node';
    }

    return null;
  }

  private isRecoverable(
    type: StaleContextType,
    locatorRef: { strategy: string; value: string; expression: string },
  ): boolean {
    switch (type) {
      case 'detached-node':
        return this.hasStableAttribute(locatorRef);
      case 'stale-element-ref':
        return true;
      case 'invalid-execution-context':
        return false;
      case 'navigation-invalidated':
        return this.hasStableAttribute(locatorRef);
      default:
        return false;
    }
  }

  private attemptReResolution(
    locatorRef: { strategy: string; value: string; expression: string },
    snapshot: ElementNode,
  ): { success: boolean; path?: string } {
    const flat = flattenDom(snapshot);
    const resolved = this.resolveExpression(locatorRef.expression, flat);

    if (resolved) {
      return { success: true, path: resolved };
    }

    const fallback = this.fallbackResolution(locatorRef, flat);
    if (fallback) {
      return { success: true, path: fallback };
    }

    return { success: false, path: undefined };
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

  private fallbackResolution(
    locatorRef: { strategy: string; value: string; expression: string },
    flatMap: Map<string, ElementNode>,
  ): string | null {
    for (const attr of STABLE_RESELECT_ATTRS) {
      for (const [path, node] of flatMap) {
        if (node.attributes[attr] === locatorRef.value) {
          return path;
        }
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

  private hasStableAttribute(locatorRef: { strategy: string; value: string; expression: string }): boolean {
    return STABLE_RESELECT_ATTRS.some(attr =>
      locatorRef.expression.includes(attr) || locatorRef.value.includes(attr),
    );
  }
}
