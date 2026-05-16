/**
 * Replay schema versioning and normalization constants.
 *
 * SCHEMA_VERSION must be bumped whenever the canonical ReplayStep or
 * ReplaySession shape changes in a non-backward-compatible way.
 *
 * ActionTypeMap defines the bijection between TraceEvent types and
 * canonical CanonicalActionType values.
 */

import type { TraceEventType } from '../../models/trace.js';
import type { CanonicalActionType } from '../../models/replay.js';

/** Current schema version for replay session persistence. */
export const SCHEMA_VERSION = 1;

/** Directory under .testguardian/ where replay sessions are stored. */
export const REPLAY_STORAGE_DIR = 'replay';

/** File name for the replay session index. */
export const REPLAY_INDEX_FILE = 'index.json';

/**
 * Mapping from TraceEventType to CanonicalActionType.
 * Events not in this map are non-deterministic and are filtered out.
 */
export const EVENT_TYPE_TO_ACTION: Partial<Record<TraceEventType, CanonicalActionType>> = {
  navigation: 'goto',
  click: 'click',
  type: 'fill',
  select: 'select',
  assertion: 'assertion',
  wait: 'wait',
};

/**
 * Action types that carry input payload data.
 */
export const ACTION_TYPES_WITH_INPUT: ReadonlySet<CanonicalActionType> = new Set([
  'fill',
  'press',
  'select',
]);

/**
 * Action types that require a locator reference.
 */
export const ACTION_TYPES_WITH_LOCATOR: ReadonlySet<CanonicalActionType> = new Set([
  'click',
  'fill',
  'press',
  'select',
  'assertion',
]);

/**
 * Maximum number of redirect entries tracked per session.
 */
export const MAX_REDIRECT_CHAIN_LENGTH = 20;

/**
 * Maximum number of URL transitions tracked per session.
 */
export const MAX_URL_TRANSITIONS = 100;
