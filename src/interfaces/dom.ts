/**
 * DomAnalyzer — contract for DOM analysis utilities.
 *
 * All methods are pure functions operating on structured data.
 * No browser, no I/O, no side effects.
 */

import type { Result } from '../models/result.js';
import type { ElementNode, ElementSnapshot, DomDiff } from '../models/snapshot.js';
import type { Locator, LocatorStrategy } from '../models/locator.js';

export interface DomAnalyzer {
  /** Parse HTML string into an element tree. */
  parseHtml(html: string): Result<ElementNode[]>;

  /** Diff two element trees and produce a structured diff. */
  diff(before: ElementNode[], after: ElementNode[]): Result<DomDiff>;

  /** Extract all viable locator strategies for a given element node. */
  extractLocatorStrategies(node: ElementNode): Result<Array<{ strategy: LocatorStrategy; value: string }>>;

  /** Check whether a locator resolves in a given element tree. */
  resolveLocator(locator: Locator, dom: ElementNode[]): Result<ElementNode | null>;

  /** Capture an element snapshot from a node (includes computed state). */
  captureElementSnapshot(node: ElementNode): Result<ElementSnapshot>;
}
