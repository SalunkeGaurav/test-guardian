/**
 * Navigation Synchronization
 *
 * Handles SPA route transitions, delayed URL updates, async redirects,
 * soft navigation, and stale history state.
 *
 * Prevents replay execution before page readiness.
 *
 * No AI. No timing sleeps. Deterministic state analysis.
 */

import type { ReplaySession, ReplayStep } from '../../models/replay.js';
import type { NavigationSyncReport, NavigationReadiness, NavigationTransition } from './types.js';

export class NavigationSynchronizer {
  /**
   * Analyze navigation transitions in a replay session to determine
   * page readiness and synchronization state.
   */
  analyze(session: ReplaySession): NavigationSyncReport {
    const transitions: NavigationTransition[] = [];
    let pendingRedirects = 0;
    let staleHistoryStates = 0;
    let softNavigations = 0;
    let blockedByUnreadiness = false;

    const urls = this.extractUrlSequence(session);

    for (let i = 0; i < urls.length - 1; i++) {
      const fromUrl = urls[i]!;
      const toUrl = urls[i + 1]!;
      const step = session.steps[i];

      const transition = this.classifyTransition(fromUrl, toUrl, step);
      transitions.push(transition);

      if (!transition.urlUpdated) {
        pendingRedirects++;
      }
      if (!transition.historyStateValid) {
        staleHistoryStates++;
      }
      if (transition.transitionType === 'soft') {
        softNavigations++;
      }
    }

    const readiness = this.determineReadiness(transitions, session);
    if (readiness !== 'ready') {
      blockedByUnreadiness = true;
    }

    return {
      sessionId: session.id,
      transitions,
      readiness,
      pendingRedirects,
      staleHistoryStates,
      softNavigations,
      blockedByUnreadiness,
      syncedAt: session.createdAt,
    };
  }

  /**
   * Check if a replay step is safe to execute based on navigation state.
   */
  isStepSafe(step: ReplayStep, currentUrl: string, expectedUrl: string): boolean {
    if (currentUrl === expectedUrl) return true;
    if (this.isSpaTransition(currentUrl, expectedUrl)) return false;
    if (this.isRedirectPending(currentUrl, expectedUrl)) return false;
    return currentUrl.startsWith(expectedUrl.split('?')[0] ?? expectedUrl);
  }

  private extractUrlSequence(session: ReplaySession): string[] {
    const urls: string[] = [];
    if (session.entryUrl) {
      urls.push(session.entryUrl);
    }
    for (const step of session.steps) {
      if (step.pageUrl && step.pageUrl !== urls[urls.length - 1]) {
        urls.push(step.pageUrl);
      }
    }
    return urls;
  }

  private classifyTransition(
    fromUrl: string,
    toUrl: string,
    step?: ReplayStep,
  ): NavigationTransition {
    const transitionType = this.detectTransitionType(fromUrl, toUrl, step);
    const urlUpdated = this.isUrlUpdated(fromUrl, toUrl);
    const historyStateValid = this.isHistoryStateValid(fromUrl, toUrl, step);
    const documentReady = this.isDocumentReady(step);

    return {
      fromUrl,
      toUrl,
      transitionType,
      urlUpdated,
      historyStateValid,
      documentReady,
    };
  }

  private detectTransitionType(
    fromUrl: string,
    toUrl: string,
    step?: ReplayStep,
  ): NavigationTransition['transitionType'] {
    const fromOrigin = this.extractOrigin(fromUrl);
    const toOrigin = this.extractOrigin(toUrl);

    if (fromOrigin !== toOrigin) return 'hard';

    const fromPath = this.extractPath(fromUrl);
    const toPath = this.extractPath(toUrl);

    if (fromPath !== toPath) {
      if (step?.actionType === 'goto') return 'hard';
      return 'spa';
    }

    const fromQuery = this.extractQuery(fromUrl);
    const toQuery = this.extractQuery(toUrl);

    if (fromQuery !== toQuery) return 'soft';

    if (step?.navigationContext?.url && step.navigationContext.url !== fromUrl) {
      return 'redirect';
    }

    return 'history';
  }

  private isUrlUpdated(fromUrl: string, toUrl: string): boolean {
    return fromUrl !== toUrl;
  }

  private isHistoryStateValid(
    _fromUrl: string,
    _toUrl: string,
    step?: ReplayStep,
  ): boolean {
    if (!step) return true;
    if (step.result.success) return true;
    if (step.result.error?.includes('history')) return false;
    return true;
  }

  private isDocumentReady(step?: ReplayStep): boolean {
    if (!step) return true;
    return step.result.success;
  }

  private determineReadiness(
    transitions: NavigationTransition[],
    session: ReplaySession,
  ): NavigationReadiness {
    if (transitions.length === 0) return 'ready';

    const last = transitions[transitions.length - 1];
    if (!last) return 'ready';

    if (!last.documentReady) return 'failed';
    if (!last.urlUpdated && last.transitionType === 'redirect') return 'redirecting';
    if (!last.historyStateValid) return 'stale';
    if (last.transitionType === 'spa' && !last.urlUpdated) return 'pending';

    const hasFailedStep = session.steps.some(s => !s.result.success);
    if (hasFailedStep) return 'failed';

    return 'ready';
  }

  private isSpaTransition(currentUrl: string, expectedUrl: string): boolean {
    return this.extractOrigin(currentUrl) === this.extractOrigin(expectedUrl)
      && this.extractPath(currentUrl) !== this.extractPath(expectedUrl);
  }

  private isRedirectPending(currentUrl: string, expectedUrl: string): boolean {
    return currentUrl !== expectedUrl && !expectedUrl.startsWith(currentUrl);
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

  private extractQuery(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.search;
    } catch {
      const idx = url.indexOf('?');
      return idx >= 0 ? url.slice(idx) : '';
    }
  }
}
