/**
 * Async Render Detection
 *
 * Detects delayed component rendering, lazy-loaded sections, virtualized
 * lists, React/Vue re-render churn, skeleton-loader replacement.
 *
 * Generates AsyncRenderReport.
 *
 * No AI. No timing sleeps. Pure DOM state analysis.
 */

import type { ElementNode } from '../../models/snapshot.js';
import type { AsyncRenderReport, AsyncRenderObservation, AsyncRenderType } from './types.js';

const SKELETON_INDICATORS = ['skeleton', 'loading', 'spinner', 'placeholder', 'shimmer'];
const VIRTUALIZED_INDICATORS = ['virtual', 'infinite-scroll', 'windowed', 'lazy-list'];
const LAZY_LOAD_INDICATORS = ['lazy', 'defer', 'async', 'dynamic'];

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

export class AsyncRenderDetector {
  analyze(sessionId: string, snapshots: ElementNode[]): AsyncRenderReport {
    const observations: AsyncRenderObservation[] = [];
    let skeletonReplacements = 0;
    let virtualizedListInstability = 0;
    let reRenderChurnDetected = false;

    for (let i = 0; i < snapshots.length - 1; i++) {
      const before = snapshots[i]!;
      const after = snapshots[i + 1]!;

      const skeleton = this.detectSkeletonReplacement(before, after);
      if (skeleton) {
        observations.push(skeleton);
        skeletonReplacements++;
      }

      const virtualized = this.detectVirtualizedListInstability(before, after);
      if (virtualized) {
        observations.push(virtualized);
        virtualizedListInstability++;
      }

      const lazyLoad = this.detectLazyLoadCompletion(before, after);
      if (lazyLoad) {
        observations.push(lazyLoad);
      }

      const deferred = this.detectDeferredComponent(before, after);
      if (deferred) {
        observations.push(deferred);
      }

      const churn = this.detectReRenderChurn(before, after);
      if (churn) {
        observations.push(churn);
        reRenderChurnDetected = true;
      }

      const hydration = this.detectHydrationRender(before, after);
      if (hydration) {
        observations.push(hydration);
      }
    }

    const completedRenders = observations.filter(o => o.completed).length;
    const incompleteRenders = observations.length - completedRenders;

    return {
      sessionId,
      observations,
      totalAsyncRenders: observations.length,
      completedRenders,
      incompleteRenders,
      reRenderChurnDetected,
      skeletonReplacements,
      virtualizedListInstability,
      detectedAt: 0,
    };
  }

  private detectSkeletonReplacement(
    before: ElementNode,
    after: ElementNode,
  ): AsyncRenderObservation | null {
    const beforeFlat = flattenDom(before);
    const afterFlat = flattenDom(after);

    let skeletonPath = '';
    let initialCount = 0;
    let finalCount = 0;

    for (const [path, node] of beforeFlat) {
      if (this.isSkeletonElement(node)) {
        skeletonPath = path;
        initialCount = 1;
        const afterNode = afterFlat.get(path);
        finalCount = afterNode ? 1 : 0;
        break;
      }
    }

    if (!skeletonPath) return null;

    return {
      type: 'skeleton-replacement',
      containerPath: skeletonPath,
      initialElementCount: initialCount,
      finalElementCount: finalCount,
      renderCycles: 1,
      completed: finalCount === 0,
    };
  }

  private detectVirtualizedListInstability(
    before: ElementNode,
    after: ElementNode,
  ): AsyncRenderObservation | null {
    const beforeFlat = flattenDom(before);
    const afterFlat = flattenDom(after);

    for (const [path, node] of beforeFlat) {
      if (this.isVirtualizedContainer(node)) {
        const beforeCount = this.countChildElements(node);
        const afterNode = afterFlat.get(path);
        const afterCount = afterNode ? this.countChildElements(afterNode) : 0;

        if (beforeCount !== afterCount) {
          return {
            type: 'virtualized-list',
            containerPath: path,
            initialElementCount: beforeCount,
            finalElementCount: afterCount,
            renderCycles: 1,
            completed: false,
          };
        }
      }
    }

    return null;
  }

  private detectLazyLoadCompletion(
    before: ElementNode,
    after: ElementNode,
  ): AsyncRenderObservation | null {
    const beforeFlat = flattenDom(before);
    const afterFlat = flattenDom(after);

    for (const [path, afterNode] of afterFlat) {
      if (!beforeFlat.has(path) && this.isLazyLoadedElement(afterNode)) {
        return {
          type: 'lazy-load',
          containerPath: path,
          initialElementCount: 0,
          finalElementCount: 1,
          renderCycles: 1,
          completed: true,
        };
      }
    }

    return null;
  }

  private detectDeferredComponent(
    before: ElementNode,
    after: ElementNode,
  ): AsyncRenderObservation | null {
    const beforeFlat = flattenDom(before);
    const afterFlat = flattenDom(after);

    for (const [path, beforeNode] of beforeFlat) {
      if (this.isDeferredPlaceholder(beforeNode)) {
        const afterNode = afterFlat.get(path);
        if (afterNode && !this.isDeferredPlaceholder(afterNode)) {
          return {
            type: 'deferred-component',
            containerPath: path,
            initialElementCount: 1,
            finalElementCount: 1,
            renderCycles: 1,
            completed: true,
          };
        }
      }
    }

    return null;
  }

  private detectReRenderChurn(
    before: ElementNode,
    after: ElementNode,
  ): AsyncRenderObservation | null {
    const beforeFlat = flattenDom(before);
    const afterFlat = flattenDom(after);

    let changedCount = 0;
    let containerPath = '';

    for (const [path, beforeNode] of beforeFlat) {
      const afterNode = afterFlat.get(path);
      if (afterNode && beforeNode.textContent !== afterNode.textContent) {
        changedCount++;
        if (!containerPath) containerPath = path;
      }
    }

    if (changedCount > 5) {
      return {
        type: 're-render-churn',
        containerPath: containerPath || 'root',
        initialElementCount: beforeFlat.size,
        finalElementCount: afterFlat.size,
        renderCycles: changedCount,
        completed: false,
      };
    }

    return null;
  }

  private detectHydrationRender(
    before: ElementNode,
    after: ElementNode,
  ): AsyncRenderObservation | null {
    const beforeFlat = flattenDom(before);
    const afterFlat = flattenDom(after);

    for (const [path, beforeNode] of beforeFlat) {
      if (beforeNode.attributes['data-hydrate'] === 'false' || beforeNode.attributes['data-ssr'] === 'true') {
        const afterNode = afterFlat.get(path);
        if (afterNode && !afterNode.attributes['data-hydrate']) {
          return {
            type: 'hydration',
            containerPath: path,
            initialElementCount: beforeFlat.size,
            finalElementCount: afterFlat.size,
            renderCycles: 1,
            completed: true,
          };
        }
      }
    }

    return null;
  }

  private isSkeletonElement(node: ElementNode): boolean {
    const attrs = Object.values(node.attributes).join(' ').toLowerCase();
    const tag = node.tagName.toLowerCase();
    return SKELETON_INDICATORS.some(indicator =>
      attrs.includes(indicator) || tag.includes(indicator),
    );
  }

  private isVirtualizedContainer(node: ElementNode): boolean {
    const attrs = Object.values(node.attributes).join(' ').toLowerCase();
    return VIRTUALIZED_INDICATORS.some(indicator => attrs.includes(indicator));
  }

  private isLazyLoadedElement(node: ElementNode): boolean {
    const attrs = Object.values(node.attributes).join(' ').toLowerCase();
    return LAZY_LOAD_INDICATORS.some(indicator => attrs.includes(indicator))
      || node.attributes['loading'] === 'lazy';
  }

  private isDeferredPlaceholder(node: ElementNode): boolean {
    return node.attributes['data-defer'] === 'true'
      || node.attributes['data-placeholder'] === 'true'
      || node.textContent === '' && node.children.length === 0;
  }

  private countChildElements(node: ElementNode): number {
    let count = 0;
    for (const child of node.children) {
      count++;
      count += this.countChildElements(child);
    }
    return count;
  }
}
