declare module 'playwright' {
  export const chromium: {
    launch(options?: { headless?: boolean; args?: string[] }): Promise<Browser>;
  };
  export interface Browser {
    newContext(options?: { viewport?: { width: number; height: number } }): Promise<BrowserContext>;
    close(): Promise<void>;
  }
  export interface BrowserContext {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }
  export interface Page {
    goto(url: string, options?: { timeout?: number; waitUntil?: string }): Promise<unknown>;
    title(): Promise<string>;
    content(): Promise<string>;
    waitForTimeout(ms: number): Promise<void>;
    locator(selector: string): Locator;
    getByRole(role: string, options?: unknown): Locator;
    getByText(text: string): Locator;
    url(): string;
  }
  export interface Locator {
    waitFor(options?: { state?: string; timeout?: number }): Promise<void>;
    click(options?: { timeout?: number }): Promise<void>;
    fill(value: string, options?: { timeout?: number }): Promise<void>;
    press(key: string, options?: { timeout?: number }): Promise<void>;
    selectOption(value: string, options?: { timeout?: number }): Promise<void>;
    boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null>;
    isVisible(): Promise<boolean>;
    isEnabled(): Promise<boolean>;
    count(): Promise<number>;
    nth(index: number): Locator;
    evaluate<T>(fn: (element: Element) => T): Promise<T>;
    textContent(): Promise<string | null>;
  }
}