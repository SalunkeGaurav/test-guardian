# Broken Selector Recovery Example

A project demonstrating TestGuardian's ability to recover from broken selectors.

## Setup

```bash
npm init -y
npm install -D playwright @playwright/test
npx playwright install chromium
```

## Project Structure

```
broken-selector-recovery/
├── package.json
├── playwright.config.ts
├── tests/
│   └── broken-selectors.spec.ts
└── README.md
```

## Broken Selector Test File

`tests/broken-selectors.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('login with broken ID selector', async ({ page }) => {
  await page.goto('https://example.com/login');

  // BROKEN: ID was changed from #username to #user-input
  await page.locator('#username').fill('testuser');
  await page.locator('#password').fill('password123');
  await page.locator('#login-btn').click();

  await expect(page.locator('#welcome')).toBeVisible();
});

test('search with broken class selector', async ({ page }) => {
  await page.goto('https://example.com/search');

  // BROKEN: Class was renamed from .search-input to .search-field
  await page.locator('.search-input').fill('test query');
  await page.locator('.search-button').click();

  await expect(page.locator('.search-results')).toBeVisible();
});

test('checkout with broken attribute selector', async ({ page }) => {
  await page.goto('https://example.com/checkout');

  // BROKEN: Attribute was removed
  await page.locator('[data-qa="add-to-cart"]').click();
  await page.locator('[data-qa="proceed-checkout"]').click();

  await expect(page.locator('[data-qa="order-confirmation"]')).toBeVisible();
});

test('navigation with broken text selector', async ({ page }) => {
  await page.goto('https://example.com/home');

  // BROKEN: Text was changed
  await page.getByText('Sign In').click();
  await page.getByText('Create Account').click();

  await expect(page.getByText('Welcome')).toBeVisible();
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
Locators:         10
  Broken:         8
  Stable:         2
Recovery Options: 16
```

### 2. Run Pipeline

```bash
npx testguardian pipeline .
```

**Expected Output:**
```
=== Healing Pipeline Report ===

Total Proposals:    8
Recovery Rate:      100%
Confidence Score:   0.88
Safety Passed:      true
Governance Status:  accepted

Recovery Proposals:
  [HIGH] #username → #user-input (ID changed)
  [HIGH] #password → #user-password (ID changed)
  [HIGH] #login-btn → button[type="submit"] (ID removed)
  [MEDIUM] .search-input → .search-field (class renamed)
  [MEDIUM] .search-button → button[type="submit"] (class removed)
  [LOW] [data-qa="add-to-cart"] → button:has-text("Add to Cart") (attribute removed)
  [LOW] [data-qa="proceed-checkout"] → button:has-text("Checkout") (attribute removed)
  [MEDIUM] 'Sign In' → 'Login' (text changed)
```

### 3. Review Recovery Bundle

```bash
npx testguardian review --report .testguardian/pipeline/latest.json
```

**Expected Output:**
```
=== Developer Review Bundle ===

Report ID:        review-1
Total Proposals:  8
  High Priority:  3
  Medium Priority: 3
  Low Priority:   2

Recovery Summary:
  ID Selectors:     3 broken, 3 recovered
  Class Selectors:  2 broken, 2 recovered
  Attribute Selectors: 2 broken, 2 recovered
  Text Selectors:   1 broken, 1 recovered

Recommendations:
  1. Use data-testid attributes for critical selectors
  2. Prefer semantic selectors over CSS classes
  3. Add fallback selectors for high-priority tests
```

## Recovery Strategies

TestGuardian uses these strategies to recover broken selectors:

| Strategy | Description | Example |
|----------|-------------|---------|
| **ID Migration** | Find new ID for changed element | `#username` → `#user-input` |
| **Class Migration** | Find new class for renamed element | `.search-input` → `.search-field` |
| **Semantic Fallback** | Use semantic selector when ID/class removed | `#login-btn` → `button[type="submit"]` |
| **Text Fallback** | Use text-based selector when attribute removed | `[data-qa="add"]` → `button:has-text("Add")` |
| **Attribute Recovery** | Find alternative attribute | `[data-qa="x"]` → `[aria-label="x"]` |
| **Structural Recovery** | Use DOM position as fallback | `nth-child(3)` → `:has-text("content")` |

## Recovery Confidence

Recovery confidence is calculated based on:

1. **Selector Specificity**: More specific selectors have higher confidence
2. **DOM Proximity**: Selectors near the original element have higher confidence
3. **Semantic Match**: Selectors with similar meaning have higher confidence
4. **Test Context**: Selectors used in similar tests have higher confidence

## Key Takeaways

1. **Broken selectors are recoverable**: TestGuardian finds alternatives automatically
2. **Confidence matters**: High-confidence recoveries are more reliable
3. **Review before applying**: Always review recovery proposals before applying
4. **Prevent with test IDs**: `data-testid` attributes prevent most selector breaks
