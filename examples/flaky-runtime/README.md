# Flaky Runtime Example

A project demonstrating TestGuardian's runtime hardening capabilities for flaky tests.

## Setup

```bash
npm init -y
npm install -D playwright @playwright/test
npx playwright install chromium
```

## Project Structure

```
flaky-runtime/
├── package.json
├── playwright.config.ts
├── tests/
│   └── flaky.spec.ts
└── README.md
```

## Flaky Test File

`tests/flaky.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('flaky: modal appears after delay', async ({ page }) => {
  await page.goto('https://example.com/dashboard');

  // Flaky: modal may appear at different times
  await page.locator('.welcome-modal').click();

  await expect(page.locator('.modal-content')).toBeVisible();
});

test('flaky: dynamic content loading', async ({ page }) => {
  await page.goto('https://example.com/feed');

  // Flaky: content loads asynchronously
  const items = await page.locator('.feed-item').all();
  expect(items.length).toBeGreaterThan(0);
});

test('flaky: iframe content', async ({ page }) => {
  await page.goto('https://example.com/embedded');

  // Flaky: iframe may not be ready
  const frame = page.frame({ name: 'content-frame' });
  await expect(frame!.locator('.embedded-content')).toBeVisible();
});

test('flaky: navigation race condition', async ({ page }) => {
  await page.goto('https://example.com/login');
  await page.locator('#username').fill('user');
  await page.locator('#password').fill('pass');

  // Flaky: navigation may complete before assertion
  await page.locator('#submit').click();
  await expect(page).toHaveURL('/dashboard');
});
```

## Running TestGuardian

### 1. Analyze

```bash
npx testguardian analyze .
```

**Expected Output:**
```
=== TestGuardian Analysis Report ===

Framework:        playwright
Test Files:       1
Total Tests:      4
Locators:         8
  Fragile:        6
  Stable:         2
Flaky Patterns:   4
  Async Loading:  2
  Iframe:         1
  Navigation:     1
Healing Opportunities: 6
```

### 2. Runtime Hardening

```bash
npx testguardian runtime-hardening --test ./tests/flaky.spec.ts
```

**Expected Output:**
```
=== Runtime Hardening Report ===

Test File:        flaky.spec.ts
Total Tests:      4
Hardened Tests:   4

Hardening Applied:
  [ASYNC-RENDER] test: 'modal appears after delay'
    Added: await page.waitForSelector('.welcome-modal', { state: 'visible' })

  [DOM-SETTLING] test: 'dynamic content loading'
    Added: await page.waitForLoadState('networkidle')

  [IFRAME-HANDLING] test: 'iframe content'
    Added: await frame.waitForLoadState('domcontentloaded')

  [NAVIGATION-SYNC] test: 'navigation race condition'
    Added: await page.waitForURL('/dashboard')
```

### 3. Runtime Healing

```bash
npx testguardian runtime-heal \
  --test ./tests/flaky.spec.ts \
  --line 5 \
  --locator "page.locator('.welcome-modal')"
```

**Expected Output:**
```
=== Runtime Healing Report ===

Test:             flaky.spec.ts:5
Locator:          page.locator('.welcome-modal')
Issue:            Element not visible (async render)

Healing Proposal:
  Original:       await page.locator('.welcome-modal').click()
  Proposed:       await page.waitForSelector('.welcome-modal', { state: 'visible' })
                  await page.locator('.welcome-modal').click()
  Confidence:     0.95
  Safety:         passed
```

## Runtime Hardening Strategies

TestGuardian applies these hardening strategies:

| Strategy | Issue | Solution |
|----------|-------|----------|
| Async Render Detection | Element not ready | `waitForSelector` with visible state |
| DOM Settling | DOM still loading | `waitForLoadState('networkidle')` |
| Iframe Handling | Frame not ready | `frame.waitForLoadState` |
| Navigation Sync | URL changed too fast | `waitForURL` |
| Stale Context Recovery | Element reference stale | Re-query element before interaction |
| Replay Drift Detection | Replay differs from original | Compare execution traces |

## Key Takeaways

1. **Flaky tests have patterns**: Async loading, iframes, navigation races
2. **Runtime hardening is deterministic**: Same hardening applied every time
3. **TestGuardian explains changes**: Every hardening includes a reason
4. **Safety first**: Hardening is validated before application
