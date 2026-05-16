/**
 * Runtime schema versioning and configuration constants.
 */

export const RUNTIME_SCHEMA_VERSION = 1;
export const RUNTIME_STORAGE_DIR = 'runtime';
export const RUNTIME_INDEX_FILE = 'runtime.json';
export const DEFAULT_BROWSER_TIMEOUT = 30_000;
export const DEFAULT_VIEWPORT_WIDTH = 1280;
export const DEFAULT_VIEWPORT_HEIGHT = 720;

/**
 * Mapping from replay action types to CSS pseudo-selectors / interaction types
 * used for role-based interactability checks.
 */
export const ACTION_INTERACTION_TYPES: Record<string, string> = {
  goto: 'navigate',
  click: 'click',
  fill: 'fill',
  press: 'press',
  select: 'select',
  wait: 'wait',
};
