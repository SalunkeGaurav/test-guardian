/**
 * Schema Version Validation
 *
 * Enforces forward/backward compatibility for persisted data.
 * Every schema has a declared version. Loader checks version before use.
 *
 * Versioning rules:
 *   - MAJOR bump: incompatible change (different fields, removed fields)
 *   - MINOR bump: additive change (new optional fields)
 *   - PATCH bump: internal/reformatting only (same data, different formatting)
 *
 * For this codebase, we only bump MAJOR version and treat it as breaking.
 * MINOR/PATCH are considered forward-compatible (readers ignore unknown fields).
 *
 * No AI. Pure validation. No side effects.
 */

export interface SchemaInfo {
  schemaVersion: number;
  [key: string]: unknown;
}

export interface SchemaValidationResult {
  ok: boolean;
  error?: string;
  loadedVersion?: number;
  expectedVersion?: number;
}

/**
 * Validate that a loaded object has the expected schema version.
 * Returns failure if version is missing, missing if version mismatches.
 *
 * @param data - The loaded JSON object
 * @param expectedVersion - The current schema version
 * @param entityName - Human-readable name for error messages
 */
export function validateSchemaVersion(
  data: unknown,
  expectedVersion: number,
  entityName: string,
): SchemaValidationResult {
  if (data === null || data === undefined) {
    return { ok: false, error: `${entityName}: null or undefined data` };
  }

  if (typeof data !== 'object') {
    return { ok: false, error: `${entityName}: expected object, got ${typeof data}` };
  }

  const obj = data as Record<string, unknown>;

  if (!Object.prototype.hasOwnProperty.call(obj, 'schemaVersion')) {
    return {
      ok: false,
      error: `${entityName}: missing schemaVersion field`,
      expectedVersion,
    };
  }

  const loadedVersion = obj['schemaVersion'];

  if (typeof loadedVersion !== 'number') {
    return {
      ok: false,
      error: `${entityName}: schemaVersion must be a number, got ${typeof loadedVersion}`,
      expectedVersion,
    };
  }

  if (loadedVersion !== expectedVersion) {
    return {
      ok: false,
      error: `${entityName}: schema version mismatch: expected ${expectedVersion}, got ${loadedVersion}`,
      loadedVersion,
      expectedVersion,
    };
  }

  return { ok: true, loadedVersion, expectedVersion };
}

/**
 * Validate schema version with forward-compatibility.
 * Loads succeed if loaded version <= expected version.
 * Rejects if loaded version > expected (data from a newer schema).
 */
export function validateSchemaVersionForwardCompatible(
  data: unknown,
  expectedVersion: number,
  entityName: string,
): SchemaValidationResult {
  const strict = validateSchemaVersion(data, expectedVersion, entityName);
  if (strict.ok) return strict;

  const obj = data as Record<string, unknown>;
  const loadedVersion = obj['schemaVersion'] as number | undefined;

  if (typeof loadedVersion !== 'number') {
    return strict;
  }

  if (loadedVersion < expectedVersion) {
    return {
      ok: true,
      loadedVersion,
      expectedVersion,
    };
  }

  if (loadedVersion > expectedVersion) {
    return {
      ok: false,
      error: `${entityName}: Schema version mismatch: expected ${expectedVersion}, got ${loadedVersion}`,
      loadedVersion,
      expectedVersion,
    };
  }

  return strict;
}

/**
 * Attach or update schema version to an object.
 * Does not mutate original.
 */
export function withSchemaVersion<T extends SchemaInfo>(
  obj: Omit<T, 'schemaVersion'>,
  version: number,
): T {
  return { ...obj, schemaVersion: version } as T;
}

/**
 * Known schema versions for each entity type.
 */
export const KNOWN_SCHEMAS = {
  replay: 1,
  audit: 1,
  patch: 1,
  runtime: 1,
  healingCandidate: 1,
  healingProposal: 1,
  explanation: 1,
  stability: 1,
} as const;