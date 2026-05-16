/**
 * Deterministic Serialization
 *
 * Provides consistent JSON serialization across all persisters.
 * Key properties:
 *   - Object key ordering is always alphabetical (deterministic)
 *   - Same data always serializes to the same string
 *   - No trailing commas, no undefined values
 *
 * Uses a custom replacer that sorts keys recursively.
 */

export interface SerializerOptions {
  indent?: number;
  sortKeys?: boolean;
  skipUndefined?: boolean;
  skipNull?: boolean;
}

const DEFAULT_OPTIONS: SerializerOptions = {
  indent: 2,
  sortKeys: true,
  skipUndefined: true,
  skipNull: false,
};

/**
 * Serialize a value to a deterministic JSON string.
 * Keys are sorted alphabetically at every level.
 */
export function serialize<T>(value: T, options: SerializerOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return JSON.stringify(value, opts.sortKeys ? sortedKeyReplacer(opts) : undefined, opts.indent ?? 2);
}

/**
 * Serialize without indentation (compact form).
 */
export function serializeCompact<T>(value: T): string {
  return serialize(value, { indent: 0, sortKeys: true });
}

function sortedKeyReplacer(opts: SerializerOptions): (key: string, value: unknown) => unknown {
  return (_key: string, value: unknown): unknown => {
    if (opts.skipUndefined && value === undefined) return undefined;
    if (opts.skipNull && value === null) return undefined;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value as object)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          const v = (value as Record<string, unknown>)[k];
          if (opts.skipUndefined && v === undefined) return acc;
          if (opts.skipNull && v === null) return acc;
          acc[k] = v;
          return acc;
        }, {});
    }
    return value;
  };
}

/**
 * Safely parse JSON, returning null on failure.
 */
export function safeParse<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

/**
 * Compute a stable content hash for a value.
 * Useful for change detection, deduplication, comparison.
 */
export function contentHash<T>(value: T): string {
  const { createHash } = require('node:crypto');
  const str = serializeCompact(value);
  return createHash('sha256').update(str).digest('hex').slice(0, 16);
}