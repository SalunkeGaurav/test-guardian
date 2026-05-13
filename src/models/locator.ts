/**
 * Locator domain models.
 *
 * A Locator is a single selector targeting one element.
 * LocatorIndexEntry is how a locator is stored in the index.
 * LocatorIndex is the full in-memory index structure.
 */

export type LocatorStrategy =
  | 'css'
  | 'xpath'
  | 'text'
  | 'id'
  | 'class-name'
  | 'aria-label'
  | 'label'
  | 'testid'
  | 'role'
  | 'placeholder'
  | 'alt-text'
  | 'title'
  | 'name'
  | 'tag'
  | 'custom';

export interface Locator {
  /** Stable hash of (strategy + value). */
  id: string;
  strategy: LocatorStrategy;
  value: string;
  /** Framework-specific representation (e.g. page.locator(...)). */
  expression: string;
  /** Source file where this locator was found. */
  sourceFile: string;
  sourceLine: number;
  /** Surrounding code context (1-2 lines before/after). */
  context?: string;
  /** Element metadata gathered from the DOM when available. */
  elementType?: string;
  attributes?: Record<string, string>;
  /** Text content of the element at capture time. */
  innerText?: string;
  /** Name assigned in page object (property name) or null if inline. */
  propertyName: string | null;
  /** Whether this locator has been verified recently. */
  verified: boolean;
  /** Timestamp of last verification. */
  verifiedAt?: number;
}

export interface LocatorIndexEntry {
  locator: Locator;
  /** References to trace IDs where this locator was exercised. */
  traceIds: string[];
  /** How many times this locator resolved successfully. */
  successCount: number;
  /** How many times this locator failed to resolve. */
  failureCount: number;
  /** Timestamp of first sighting. */
  firstSeen: number;
  /** Timestamp of most recent use. */
  lastSeen: number;
}

export interface LocatorIndex {
  /** All known locators keyed by hash. */
  entries: Map<string, LocatorIndexEntry>;
  /** Index of locators by source file path. */
  byFile: Map<string, LocatorIndexEntry[]>;
  /** Index of locators by strategy type. */
  byStrategy: Map<LocatorStrategy, LocatorIndexEntry[]>;
}
