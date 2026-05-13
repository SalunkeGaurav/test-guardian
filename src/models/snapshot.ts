/**
 * DOM snapshot domain models.
 *
 * DomSnapshot is a full-page snapshot captured at a point in time.
 * ElementSnapshot captures a single element's state.
 * DomDiff describes structural differences between two snapshots.
 */

export interface DomSnapshot {
  /** Unique snapshot ID. */
  id: string;
  /** Trace event that triggered this snapshot. */
  traceId: string;
  eventIndex: number;
  /** Timestamp when snapshot was taken. */
  capturedAt: number;
  /** URL of the page at capture time. */
  url: string;
  /** Full HTML content (may be large; stored on disk, not in memory). */
  htmlPath?: string;
  /** Structured element tree (lightweight alternative to full HTML). */
  elementTree?: ElementNode[];
  /** Viewport dimensions at capture. */
  viewport?: { width: number; height: number };
}

export interface ElementNode {
  tagName: string;
  /** Element attributes (class, id, data-*, etc.). */
  attributes: Record<string, string>;
  /** Computed bounding rect (if available). */
  rect?: { x: number; y: number; width: number; height: number };
  children: ElementNode[];
  /** Text content (empty for container elements). */
  textContent?: string;
  /** Whether this element is visible. */
  visible: boolean;
}

export interface ElementSnapshot {
  /** Matches the Locator.id this snapshot relates to. */
  locatorId: string;
  /** The strategy that was used to locate this element. */
  strategy: string;
  /** The value/selector used. */
  selector: string;
  /** Captured at. */
  capturedAt: number;
  /** Element properties. */
  tagName: string;
  attributes: Record<string, string>;
  textContent?: string;
  /** Bounding box. */
  boundingBox?: { x: number; y: number; width: number; height: number };
  /** Whether the element was found and visible. */
  found: boolean;
  /** If not found, what was at that position (if anything). */
  alternative?: string;
}

export interface DomDiff {
  snapshotA: string;
  snapshotB: string;
  /** Nodes present in A but missing in B. */
  removed: NodeDiff[];
  /** Nodes present in B but missing in A. */
  added: NodeDiff[];
  /** Nodes whose attributes or text changed. */
  changed: NodeDiff[];
}

export interface NodeDiff {
  /** CSS-like path to the node. */
  path: string;
  tagName: string;
  before?: Record<string, string | undefined>;
  after?: Record<string, string | undefined>;
}
