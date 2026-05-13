/**
 * Sample page object file for parser unit tests.
 */

import { type Page, expect } from '@playwright/test';

export class LoginPage {
  readonly usernameInput = page.getByPlaceholder('Username');
  readonly passwordInput = page.locator('#password');
  readonly submitButton = page.getByRole('button', { name: 'Log in' });
  readonly errorMessage = page.getByTestId('login-error');
  readonly rememberMe = page.locator('.remember-checkbox');

  async login(username: string, password: string) {
    await page.goto('https://example.com/login');
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async navigateToLogin() {
    await page.goto('/login');
  }
}

export class DashboardPage {
  readonly header = page.locator('h1.dashboard-title');
  readonly chart = page.getByAltText('revenue-chart');
  readonly logoutButton = page.getByRole('button', { name: 'Logout' });

  async logout() {
    await this.logoutButton.click();
    await page.goto('/logout');
  }
}

export class SearchPage {
  readonly searchInput = page.getByTitle('Search');
  readonly results = page.locator('.search-results');
  readonly noResults = page.getByText('No results found');
}

export class ProfilePage {
  readonly avatar = page.locator('img.avatar');
  readonly nameField = page.getByLabel('Full Name');
  readonly saveButton = page.getByTestId('save-profile');
  readonly cancelButton = page.getByRole('button', { name: 'Cancel' });
}
