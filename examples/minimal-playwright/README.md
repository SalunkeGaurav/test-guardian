# Minimal Playwright Example

A minimal Playwright project demonstrating TestGuardian's core healing capabilities.

## Setup

```bash
npm init -y
npm install -D playwright @playwright/test
npx playwright install chromium
```

## Project Structure

```
minimal-playwright/
├── package.json
├── playwright.config.ts
├── tests/
│   └── login.spec.ts
└── README.md
```

## Test File

`tests/login.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('user can login successfully', async ({ page }) => {
  await page.goto('https://example.com/login');

  // Fragile selector - may break if ID changes
  await page.locator('#username').fill('testuser');
  await page.locator('#password').fill('password123');

  // Even more fragile - CSS class that may change
  await page.locator('.btn-primary').click();

  await expect(page.locator('.welcome-message')).toBeVisible();
});

test('user sees error on invalid login', async ({ page }) => {
  await page.goto('https://example.com/login');

  await page.locator('#username').fill('wronguser');
  await page.locator('#password').fill('wrongpass');
  await page.locator('.btn-primary').click();

  await expect(page.locator('.error-message')).toBeVisible();
});
```

## Running TestGuardian

### 1. Analyze

```bash
npx testguardian analyze .
```

**Expected Output:**
```
[tg][info][detector] Found Playwright config: playwright.config.ts
[tg][info][scanner] Scanning for test files in ./tests
[tg][info][scanner] Found 1 test file(s)
[tg][info][playwright] Analysis complete: 1 files, 2 tests, 6 locators, 0 skipped

=== TestGuardian Analysis Report ===

Framework:        playwright
Test Files:       1
Total Tests:      2
Locators:         6
  Fragile:        4
  Stable:         2
Page Objects:     0
Navigations:      2
Healing Opportunities: 4
```

### 2. Run Pipeline

```bash
npx testguardian pipeline .
```

**Expected Output:**
```
=== Healing Pipeline Report ===

Total Proposals:    4
Confidence Score:   0.85
Safety Passed:      true
Governance Status:  accepted

Proposals:
  [HIGH] #username → [data-testid="username"]
  [HIGH] #password → [data-testid="password"]
  [MEDIUM] .btn-primary → button[type="submit"]
  [MEDIUM] .btn-primary → [data-testid="submit-btn"]
```

### 3. Review

```bash
npx testguardian review --report .testguardian/pipeline/latest.json
```

Generated reports:
- `.testguardian/analysis/analysis-report.json`
- `.testguardian/pipeline/pipeline-result.json`
- `.testguardian/pipeline/healing-proposals.json`

## Healing Examples

### Before (Fragile)

```typescript
await page.locator('#username').fill('testuser');
await page.locator('.btn-primary').click();
```

### After (Healed)

```typescript
await page.locator('[data-testid="username"]').fill('testuser');
await page.locator('button[type="submit"]').click();
```

## Key Takeaways

1. **ID selectors are fragile**: They break when developers change element IDs
2. **CSS class selectors are fragile**: They break when styles change
3. **Test IDs are stable**: `data-testid` attributes are designed for testing
4. **Semantic selectors are stable**: `button[type="submit"]` is more resilient than `.btn-primary`
