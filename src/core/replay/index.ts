/**
 * Navigation Replay Module
 *
 * Responsibilities:
 * - Convert an ExecutionTrace into a deterministic NavigationSession
 * - Execute a NavigationSession step-by-step via an adapter
 * - Record new traces during replay for comparison
 * - Fail fast on critical steps
 *
 * This module enables deterministic validation:
 *   "Run the same steps again — does the locator still resolve?"
 *
 * Replay is NOT a test runner replacement. It replays specific
 * navigation sequences to verify locators, not to run full test suites.
 *
 * Boundary: produces/consumes NavigationSession. Delegates execution to adapters.
 * No healing logic — pure replay and trace capture.
 *
 * @module replay
 */

export {};
