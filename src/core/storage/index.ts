/**
 * Storage Module
 *
 * Persistence layer for TestGuardian. Provides both in-memory and
 * disk-based storage backends.
 *
 * Sub-modules:
 *   utils/     — Shared deterministic utilities (ID generation, atomic writes, indexes)
 *   memory.ts  — In-memory storage (for analysis sessions, testing)
 */

export { MemoryStorage } from './memory.js';
export { FileStorage } from './file.js';
export * from './utils/index.js';