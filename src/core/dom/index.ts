/**
 * DOM Intelligence Module
 *
 * Responsibilities:
 * - Parse HTML into a structured ElementNode tree
 * - Diff two DOM snapshots to identify structural changes
 * - Extract locators from a DOM fragment (strategy inference)
 * - Snapshot a single element's full state (attributes, position, text)
 * - Verify whether a locator resolves in a given DOM
 *
 * This module operates on DOM snapshots — it never touches a live browser.
 * Framework adapters produce the raw HTML; this module analyses it.
 *
 * Boundary: pure functions over DomSnapshot/ElementSnapshot data.
 * No I/O, no framework imports, no side effects.
 *
 * @module dom
 */

export {};
