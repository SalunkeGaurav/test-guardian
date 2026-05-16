/**
 * BrowserEngine — abstraction over browser automation.
 *
 * Defines the contract for launching a browser, creating isolated contexts,
 * executing actions, and capturing page state.
 *
 * Implementations:
 *   - PlaywrightBrowserEngine (uses @playwright/test or playwright)
 *   - MockBrowserEngine (for testing)
 */

import type { Result } from '../../models/result.js';
import type { DomSnapshot } from '../../models/snapshot.js';
import type { BrowserContextState, NavigationResult, InteractionResult, MatchedElement } from '../../models/runtime.js';
import type { BrowserConfig } from '../../models/runtime.js';

export interface BrowserEngine {
  /** Launch a new browser instance. */
  launch(config?: BrowserConfig): Promise<Result<void>>;
  /** Close the browser instance. */
  close(): Promise<Result<void>>;
  /** Create an isolated browser context (incognito). */
  createContext(): Promise<Result<BrowserContextState>>;
  /** Close a browser context. */
  closeContext(context: BrowserContextState): Promise<Result<void>>;
  /** Navigate to a URL. */
  goto(context: BrowserContextState, url: string): Promise<Result<NavigationResult>>;
  /** Click an element identified by strategy + value. */
  click(context: BrowserContextState, strategy: string, value: string): Promise<Result<InteractionResult>>;
  /** Fill an input element with text. */
  fill(context: BrowserContextState, strategy: string, value: string, text: string): Promise<Result<InteractionResult>>;
  /** Press a key on an element. */
  press(context: BrowserContextState, strategy: string, value: string, key: string): Promise<Result<InteractionResult>>;
  /** Select an option in a dropdown. */
  select(context: BrowserContextState, strategy: string, value: string, option: string): Promise<Result<InteractionResult>>;
  /** Wait for a period of time. */
  wait(context: BrowserContextState, timeout: number): Promise<Result<void>>;
  /** Capture a DOM snapshot of the current page. */
  captureSnapshot(context: BrowserContextState): Promise<Result<DomSnapshot>>;
  /** Get the current page URL. */
  getCurrentUrl(context: BrowserContextState): Promise<string>;
  /** Collect recent console errors. */
  getConsoleErrors(context: BrowserContextState): Promise<string[]>;
  /** Resolve a locator and return matched element info without interacting. */
  resolveElement(context: BrowserContextState, strategy: string, value: string): Promise<Result<MatchedElement[]>>;
}
