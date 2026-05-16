/**
 * iframe + Modal Stability Handler
 *
 * Handles nested iframes, modal transitions, overlay interception,
 * focus traps, and dynamic modal mounting/unmounting.
 *
 * Generates FrameModalStabilityReport.
 *
 * No AI. No timing sleeps. Deterministic frame/modal state analysis.
 */

import type { ElementNode } from '../../models/snapshot.js';
import type { ReplaySession, ReplayStep } from '../../models/replay.js';
import type {
  FrameModalStabilityReport,
  FrameStabilityEntry,
  ModalStabilityEntry,
} from './types.js';

const MODAL_INDICATORS = ['modal', 'dialog', 'overlay', 'popup', 'lightbox', 'drawer'];
const FOCUS_TRAP_INDICATORS = ['focus-trap', 'aria-modal', 'role="dialog"'];

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

export class IframeModalHandler {
  analyze(
    sessionId: string,
    session: ReplaySession,
    domSnapshots: ElementNode[],
  ): FrameModalStabilityReport {
    const frames: FrameStabilityEntry[] = [];
    const modals: ModalStabilityEntry[] = [];
    let focusTrapViolations = 0;
    let overlayInterceptions = 0;

    const frameContexts = this.extractFrameContexts(session);
    for (const frameCtx of frameContexts) {
      const depth = this.computeFrameDepth(frameCtx);
      const loaded = this.isFrameLoaded(frameCtx, domSnapshots);
      const navigated = this.hasFrameNavigated(frameCtx, session);
      const detached = this.isFrameDetached(frameCtx, domSnapshots);
      const reattached = this.isFrameReattached(frameCtx, domSnapshots);

      frames.push({
        frameId: frameCtx,
        parentFrameId: this.findParentFrame(frameCtx, frameContexts),
        depth,
        loaded,
        navigated,
        detached,
        reattached,
      });
    }

    for (let i = 0; i < domSnapshots.length; i++) {
      const snapshot = domSnapshots[i]!;
      const step = session.steps[i];

      const modalEntries = this.detectModals(snapshot, step);
      for (const modal of modalEntries) {
        const existing = modals.find(m => m.modalId === modal.modalId);
        if (!existing) {
          modals.push(modal);
        }
      }

      if (step) {
        const focusTrapViolation = this.detectFocusTrapViolation(snapshot);
        if (focusTrapViolation) {
          focusTrapViolations++;
        }

        const overlayInterception = this.detectOverlayInterception(snapshot);
        if (overlayInterception) {
          overlayInterceptions++;
        }
      }
    }

    const nestedFrameCount = frames.filter(f => f.depth > 1).length;
    const modalTransitionCount = modals.filter(m => m.opened || m.closed).length;
    const stabilityPassed = this.isStable(frames, modals, focusTrapViolations, overlayInterceptions);

    return {
      sessionId,
      frames,
      modals,
      nestedFrameCount,
      modalTransitionCount,
      focusTrapViolations,
      overlayInterceptions,
      stabilityPassed,
      detectedAt: session.createdAt,
    };
  }

  private extractFrameContexts(session: ReplaySession): string[] {
    const contexts = new Set<string>();
    for (const ctx of session.frameContext) {
      contexts.add(ctx);
    }
    for (const step of session.steps) {
      if (step.navigationContext?.frame) {
        contexts.add(step.navigationContext.frame);
      }
    }
    return Array.from(contexts).sort();
  }

  private computeFrameDepth(frameId: string): number {
    const parts = frameId.split('/');
    return parts.length;
  }

  private findParentFrame(frameId: string, allFrames: string[]): string | undefined {
    const parts = frameId.split('/');
    if (parts.length <= 1) return undefined;
    const parent = parts.slice(0, -1).join('/');
    return allFrames.includes(parent) ? parent : undefined;
  }

  private isFrameLoaded(frameId: string, snapshots: ElementNode[]): boolean {
    const flat = snapshots.length > 0 ? flattenDom(snapshots[0]!) : new Map();
    for (const [, node] of flat) {
      if (node.tagName.toLowerCase() === 'iframe' && node.attributes['id'] === frameId) {
        return true;
      }
    }
    return snapshots.length > 0;
  }

  private hasFrameNavigated(frameId: string, session: ReplaySession): boolean {
    return session.frameContext.includes(frameId)
      && session.urlTransitions.length > 0;
  }

  private isFrameDetached(frameId: string, snapshots: ElementNode[]): boolean {
    if (snapshots.length < 2) return false;
    const lastFlat = flattenDom(snapshots[snapshots.length - 1]!);
    for (const [, node] of lastFlat) {
      if (node.tagName.toLowerCase() === 'iframe' && node.attributes['id'] === frameId) {
        return false;
      }
    }
    return true;
  }

  private isFrameReattached(frameId: string, snapshots: ElementNode[]): boolean {
    if (snapshots.length < 2) return false;
    const firstFlat = flattenDom(snapshots[0]!);
    const lastFlat = flattenDom(snapshots[snapshots.length - 1]!);

    let wasPresent = false;
    let isPresent = false;

    for (const [, node] of firstFlat) {
      if (node.tagName.toLowerCase() === 'iframe' && node.attributes['id'] === frameId) {
        wasPresent = true;
      }
    }
    for (const [, node] of lastFlat) {
      if (node.tagName.toLowerCase() === 'iframe' && node.attributes['id'] === frameId) {
        isPresent = true;
      }
    }

    return !wasPresent && isPresent;
  }

  private detectModals(
    snapshot: ElementNode,
    step?: ReplayStep,
  ): ModalStabilityEntry[] {
    const flat = flattenDom(snapshot);
    const modals: ModalStabilityEntry[] = [];

    for (const [path, node] of flat) {
      if (this.isModalElement(node)) {
        const modalId = node.attributes['id'] ?? path;
        const opened = step?.result.success ?? true;
        const focusTrapActive = this.hasFocusTrap(node);
        const overlayInterception = this.hasOverlayInterception(node);
        const dynamicMounting = node.attributes['data-dynamic'] === 'true';

        modals.push({
          modalId,
          opened,
          closed: !opened,
          focusTrapActive,
          overlayInterception,
          dynamicMounting,
        });
      }
    }

    return modals;
  }

  private isModalElement(node: ElementNode): boolean {
    const tag = node.tagName.toLowerCase();
    if (tag === 'dialog') return true;

    const attrs = Object.values(node.attributes).join(' ').toLowerCase();
    return MODAL_INDICATORS.some(indicator =>
      attrs.includes(indicator) || tag.includes(indicator),
    );
  }

  private hasFocusTrap(node: ElementNode): boolean {
    const attrs = Object.values(node.attributes).join(' ').toLowerCase();
    return FOCUS_TRAP_INDICATORS.some(indicator => attrs.includes(indicator));
  }

  private hasOverlayInterception(node: ElementNode): boolean {
    const attrs = Object.values(node.attributes).join(' ').toLowerCase();
    return attrs.includes('overlay') || attrs.includes('backdrop') || attrs.includes('intercept');
  }

  private detectFocusTrapViolation(snapshot: ElementNode): boolean {
    const flat = flattenDom(snapshot);
    for (const [, node] of flat) {
      if (this.hasFocusTrap(node) && node.attributes['aria-modal'] !== 'true') {
        return true;
      }
    }
    return false;
  }

  private detectOverlayInterception(snapshot: ElementNode): boolean {
    const flat = flattenDom(snapshot);
    for (const [, node] of flat) {
      if (this.hasOverlayInterception(node) && node.attributes['aria-hidden'] !== 'true') {
        return true;
      }
    }
    return false;
  }

  private isStable(
    frames: FrameStabilityEntry[],
    modals: ModalStabilityEntry[],
    focusTrapViolations: number,
    overlayInterceptions: number,
  ): boolean {
    const detachedFrames = frames.filter(f => f.detached && !f.reattached);
    const unstableModals = modals.filter(m => m.dynamicMounting && !m.opened);
    return detachedFrames.length === 0
      && unstableModals.length === 0
      && focusTrapViolations === 0
      && overlayInterceptions === 0;
  }
}
