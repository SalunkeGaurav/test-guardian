/**
 * DOM Settling Detection
 *
 * Deterministic DOM stabilization analysis using snapshot comparison.
 * Detects: unstable render loops, continuously mutating containers,
 * hydration instability.
 *
 * No AI. No timing sleeps. Pure snapshot diffing.
 */

import type { ElementNode } from '../../models/snapshot.js';
import type { DomSnapshotDiff, DomSettlingReport, DomStabilityStatus } from './types.js';

const MAX_SNAPSHOT_SEQUENCE = 5;
const MUTATION_STABILIZATION_THRESHOLD = 2;
const RENDER_LOOP_THRESHOLD = 4;

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

export class DomSettlingDetector {
  analyze(sessionId: string, snapshots: ElementNode[]): DomSettlingReport {
    const diffs: DomSnapshotDiff[] = [];
    const containers = new Map<string, number>();

    for (let i = 1; i < Math.min(snapshots.length, MAX_SNAPSHOT_SEQUENCE + 1); i++) {
      const prev = snapshots[i - 1];
      const curr = snapshots[i];
      if (!prev || !curr) continue;

      const diff = this.computeSnapshotDiff(prev, curr);
      diffs.push(diff);

      this.trackMutatingContainers(prev, curr, containers);
    }

    const mutationStabilized = this.isMutationCountStabilized(diffs);
    const layoutStabilized = this.isLayoutStabilized(diffs);
    const renderLoopDetected = this.detectRenderLoop(diffs);
    const hydrationInstability = this.detectHydrationInstability(diffs);

    const continuouslyMutating = this.extractContinuouslyMutatingContainers(containers, diffs.length);

    const status = this.determineStatus(
      mutationStabilized,
      layoutStabilized,
      renderLoopDetected,
      hydrationInstability,
      continuouslyMutating,
    );

    return {
      sessionId,
      status,
      snapshotSequence: diffs,
      stabilizationCheckCount: diffs.length,
      mutationCountStabilized: mutationStabilized,
      layoutStabilized: layoutStabilized,
      renderLoopDetected: renderLoopDetected,
      continuouslyMutatingContainers: continuouslyMutating,
      hydrationInstabilityDetected: hydrationInstability,
      settledAt: 0,
    };
  }

  private computeSnapshotDiff(prev: ElementNode, curr: ElementNode): DomSnapshotDiff {
    const prevFlat = flattenDom(prev);
    const currFlat = flattenDom(curr);

    let addedNodes = 0;
    let removedNodes = 0;
    let changedAttributes = 0;
    let changedText = 0;

    for (const [path, prevNode] of prevFlat) {
      const currNode = currFlat.get(path);
      if (!currNode) {
        removedNodes++;
        continue;
      }
      if (prevNode.tagName !== currNode.tagName) {
        removedNodes++;
        addedNodes++;
        continue;
      }
      const attrChanges = this.countAttributeChanges(prevNode.attributes, currNode.attributes);
      changedAttributes += attrChanges;
      if (prevNode.textContent !== currNode.textContent) {
        changedText++;
      }
    }

    for (const path of currFlat.keys()) {
      if (!prevFlat.has(path)) {
        addedNodes++;
      }
    }

    return {
      addedNodes,
      removedNodes,
      changedAttributes,
      changedText,
      totalMutations: addedNodes + removedNodes + changedAttributes + changedText,
    };
  }

  private countAttributeChanges(
    prev: Record<string, string>,
    curr: Record<string, string>,
  ): number {
    let changes = 0;
    const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)]);
    for (const key of allKeys) {
      if (prev[key] !== curr[key]) {
        changes++;
      }
    }
    return changes;
  }

  private trackMutatingContainers(
    prev: ElementNode,
    curr: ElementNode,
    containers: Map<string, number>,
  ): void {
    const prevFlat = flattenDom(prev);
    const currFlat = flattenDom(curr);

    for (const [path, prevNode] of prevFlat) {
      const currNode = currFlat.get(path);
      if (!currNode) {
        containers.set(path, (containers.get(path) ?? 0) + 1);
        continue;
      }
      if (prevNode.children.length !== currNode.children.length) {
        containers.set(path, (containers.get(path) ?? 0) + 1);
      }
    }
  }

  private isMutationCountStabilized(diffs: DomSnapshotDiff[]): boolean {
    if (diffs.length < MUTATION_STABILIZATION_THRESHOLD) return false;
    const lastTwo = diffs.slice(-MUTATION_STABILIZATION_THRESHOLD);
    return lastTwo.every(d => d.totalMutations === 0);
  }

  private isLayoutStabilized(diffs: DomSnapshotDiff[]): boolean {
    if (diffs.length < 2) return false;
    const last = diffs[diffs.length - 1];
    if (!last) return false;
    return last.addedNodes === 0 && last.removedNodes === 0;
  }

  private detectRenderLoop(diffs: DomSnapshotDiff[]): boolean {
    if (diffs.length < RENDER_LOOP_THRESHOLD) return false;
    const recent = diffs.slice(-RENDER_LOOP_THRESHOLD);
    return recent.every(d => d.totalMutations > 0);
  }

  private detectHydrationInstability(diffs: DomSnapshotDiff[]): boolean {
    if (diffs.length < 3) return false;
    const first = diffs[0];
    const last = diffs[diffs.length - 1];
    if (!first || !last) return false;
    return first.totalMutations > 10 && last.totalMutations > 5;
  }

  private extractContinuouslyMutatingContainers(
    containers: Map<string, number>,
    snapshotCount: number,
  ): string[] {
    const result: string[] = [];
    for (const [path, count] of containers) {
      if (count >= snapshotCount) {
        result.push(path);
      }
    }
    return result.sort();
  }

  private determineStatus(
    mutationStabilized: boolean,
    layoutStabilized: boolean,
    renderLoopDetected: boolean,
    hydrationInstability: boolean,
    continuouslyMutating: string[],
  ): DomStabilityStatus {
    if (renderLoopDetected) return 'render-loop';
    if (continuouslyMutating.length > 0) return 'mutating';
    if (hydrationInstability) return 'unstable';
    if (mutationStabilized && layoutStabilized) return 'stable';
    return 'unstable';
  }
}
