/**
 * Runtime Session Manager
 *
 * Manages browser lifecycle: launch, context creation/teardown,
 * and isolated session boundaries.
 *
 * Each replay gets its own browser context to ensure isolation.
 */

import type { Result } from '../../models/result.js';
import type { BrowserConfig, BrowserContextState, BrowserMetadata } from '../../models/runtime.js';
import { success, failure } from '../../models/result.js';
import { DEFAULT_VIEWPORT_WIDTH, DEFAULT_VIEWPORT_HEIGHT } from './schema.js';
import type { BrowserEngine } from './browser.js';

export interface ManagedSession {
  browserContext: BrowserContextState;
  metadata: BrowserMetadata;
  startedAt: number;
}

export class SessionManager {
  private launched = false;

  constructor(private readonly browser: BrowserEngine) {}

  /**
   * Create a new isolated replay session.
   * Launches browser if not already running, creates a fresh context.
   */
  async startSession(config?: BrowserConfig): Promise<Result<ManagedSession>> {
    try {
      if (!this.launched) {
        const launchResult = await this.browser.launch(config);
        if (!launchResult.ok) return failure(launchResult.error);
        this.launched = true;
      }

      const contextResult = await this.browser.createContext();
      if (!contextResult.ok) return failure(contextResult.error);

      return success({
        browserContext: contextResult.value,
        metadata: {
          browserName: 'chromium',
          viewport: config?.viewport ?? { width: DEFAULT_VIEWPORT_WIDTH, height: DEFAULT_VIEWPORT_HEIGHT },
        },
        startedAt: Date.now(),
      });
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * End a replay session — close the context.
   * Does NOT close the browser (reusable across sessions).
   */
  async endSession(session: ManagedSession): Promise<Result<void>> {
    try {
      return await this.browser.closeContext(session.browserContext);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Shut down the entire browser.
   */
  async shutdown(): Promise<Result<void>> {
    try {
      if (this.launched) {
        const result = await this.browser.close();
        this.launched = false;
        return result;
      }
      return success(undefined);
    } catch (err) {
      return failure(err instanceof Error ? err.message : String(err));
    }
  }

  get isLaunched(): boolean {
    return this.launched;
  }
}
