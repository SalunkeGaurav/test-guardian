# Enterprise POM Example

A Page Object Model (POM) project demonstrating TestGuardian's analysis of enterprise-scale test architectures.

## Setup

```bash
npm init -y
npm install -D playwright @playwright/test typescript
npx playwright install chromium
```

## Project Structure

```
enterprise-pom/
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── pages/
│   ├── base-page.ts
│   ├── login-page.ts
│   ├── dashboard-page.ts
│   └── settings-page.ts
├── tests/
│   ├── login.spec.ts
│   ├── dashboard.spec.ts
│   └── settings.spec.ts
└── README.md
```

## Page Objects

`pages/base-page.ts`:

```typescript
import { Page } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path: string) {
    await this.page.goto(`${process.env.BASE_URL}${path}`);
  }
}
```

`pages/login-page.ts`:

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base-page';

export class LoginPage extends BasePage {
  // Fragile selectors that TestGuardian will identify
  readonly usernameInput = '#login-username';
  readonly passwordInput = '#login-password';
  readonly submitButton = '.login-submit-btn';
  readonly errorMessage = '.alert-danger';
  readonly successMessage = '.alert-success';

  constructor(page: Page) {
    super(page);
  }

  async login(username: string, password: string) {
    await this.page.locator(this.usernameInput).fill(username);
    await this.page.locator(this.passwordInput).fill(password);
    await this.page.locator(this.submitButton).click();
  }

  async getErrorMessage() {
    return this.page.locator(this.errorMessage).textContent();
  }
}
```

`pages/dashboard-page.ts`:

```typescript
import { Page } from '@playwright/test';
import { BasePage } from './base-page';

export class DashboardPage extends BasePage {
  readonly welcomeMessage = '.dashboard-welcome';
  readonly userMenu = '#user-menu-dropdown';
  readonly settingsLink = '.settings-link';
  readonly logoutButton = '#logout-btn';
  readonly statsCards = '.stats-card';
  readonly recentActivity = '.recent-activity-item';

  constructor(page: Page) {
    super(page);
  }

  async getWelcomeMessage() {
    return this.page.locator(this.welcomeMessage).textContent();
  }

  async navigateToSettings() {
    await this.page.locator(this.userMenu).click();
    await this.page.locator(this.settingsLink).click();
  }

  async logout() {
    await this.page.locator(this.userMenu).click();
    await this.page.locator(this.logoutButton).click();
  }
}
```

## Test Files

`tests/login.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login-page';

test.describe('Login', () => {
  test('successful login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate('/login');
    await loginPage.login('admin', 'password');
    await expect(page.locator('.dashboard-welcome')).toBeVisible();
  });

  test('failed login shows error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.navigate('/login');
    await loginPage.login('wrong', 'wrong');
    await expect(page.locator('.alert-danger')).toBeVisible();
  });
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
Test Files:       3
Total Tests:      8
Locators:         24
  Fragile:        18
  Stable:         6
Page Objects:     3
Navigations:      6
Healing Opportunities: 12
```

### 2. Run Pipeline

```bash
npx testguardian pipeline .
```

**Expected Output:**
```
=== Healing Pipeline Report ===

Total Proposals:    12
Confidence Score:   0.78
Safety Passed:      true
Governance Status:  accepted

Proposals by Page:
  LoginPage:        5 proposals
  DashboardPage:    4 proposals
  SettingsPage:     3 proposals
```

### 3. Review

```bash
npx testguardian review --report .testguardian/pipeline/latest.json
```

## POM-Specific Insights

TestGuardian analyzes POM projects differently:

1. **Page Object Detection**: Identifies classes that extend base pages
2. **Selector Extraction**: Extracts selectors from page object properties
3. **Usage Analysis**: Tracks how selectors are used across tests
4. **Impact Assessment**: Identifies which tests are affected by fragile selectors

### Example Analysis

```json
{
  "pageObjects": [
    {
      "name": "LoginPage",
      "selectors": 5,
      "fragileSelectors": 4,
      "affectedTests": 2,
      "recommendations": [
        "Replace #login-username with [data-testid=\"username\"]",
        "Replace .login-submit-btn with button[type=\"submit\"]"
      ]
    }
  ]
}
```

## Key Takeaways

1. **POM centralizes selectors**: Fixing a selector in the page object fixes all tests
2. **TestGuardian tracks selector usage**: Shows which tests are affected by each fragile selector
3. **High-impact fixes**: Fixing a selector used by 5 tests is more valuable than fixing one used by 1 test
