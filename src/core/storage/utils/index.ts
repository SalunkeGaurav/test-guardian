/**
 * Storage Infrastructure Utilities
 *
 * Centralized, deterministic persistence utilities shared by all persisters.
 * Replaces duplicated implementations across replay, audit, runtime, and patch persisters.
 *
 * Modules:
 *   id-generator  - Deterministic, stable-hash-based ID generation
 *   atomic-write  - Corruption-safe file writes (temp + rename)
 *   schema-validator - Schema version enforcement with forward-compatibility
 *   index-manager - Lightweight index management with deterministic ordering
 *   serialization - Deterministic JSON serialization with stable key ordering
 *
 * No AI. No external dependencies. Deterministic.
 */

export { generateTraceId, generateSessionId, generateStepId, generateCandidateId, generateValidationId, generateRuntimeId, generatePatchId, generateAuditId, generateSnapshotId, generateStabilityId, generateExplanationId, generateProposalId, generateHealingHistoryId, verifyIdConsistency } from './id-generator.js';
export type { EntityType } from './id-generator.js';

export { atomicWrite, atomicWriteJson, safeDelete, atomicDelete, safeReadJson, safeReadText } from './atomic-write.js';

export { validateSchemaVersion, validateSchemaVersionForwardCompatible, withSchemaVersion, KNOWN_SCHEMAS } from './schema-validator.js';
export type { SchemaInfo, SchemaValidationResult } from './schema-validator.js';

export { IndexManager, listStorageFiles, loadEntityFile } from './index-manager.js';
export type { IndexEntry, IndexConfig, SortField, SortDirection } from './index-manager.js';

export { serialize, serializeCompact, safeParse, contentHash } from './serialization.js';