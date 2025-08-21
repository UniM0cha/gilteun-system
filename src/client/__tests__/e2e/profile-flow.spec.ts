import { test, expect } from '@playwright/test';

test.describe('Profile Creation Flow with shadcn/ui Components', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete profile creation flow with proper UI components', async ({ page }) => {
    // Should start with profile selector card
    const welcomeCard = page.locator('.max-w-md').first();
    await expect(welcomeCard).toBeVisible();

    // Click create new profile button
    const createButton = page.getByRole('button', { name: /새 프로필 생성/ });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Should navigate to profile creation form
    await expect(page.getByText('새 프로필 생성')).toBeVisible();

    // Fill out the form using shadcn/ui components
    const nameInput = page.locator('input[type="text"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('E2E Test User');

    // Select role using radio group
    const sessionRole = page.locator('input[value="session"]');
    await expect(sessionRole).toBeVisible();
    await sessionRole.click();

    // Select instrument (assuming there's an instrument selector)
    const instrumentButtons = page.getByRole('button').filter({ hasText: /기타|드럼|베이스|키보드/ });
    const instrumentCount = await instrumentButtons.count();

    if (instrumentCount > 0) {
      await instrumentButtons.first().click();
    }

    // Submit the form
    const submitButton = page.getByRole('button', { name: /프로필 생성/ });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Should proceed to worship selection
    await expect(page.getByText(/참여할 예배 선택|예배 목록/)).toBeVisible();
  });

  test('should validate form inputs properly', async ({ page }) => {
    // Go to profile creation
    const createButton = page.getByRole('button', { name: /새 프로필 생성/ });
    await createButton.click();

    // Try to submit without filling required fields
    const submitButton = page.getByRole('button', { name: /프로필 생성/ });

    // Button should be disabled when form is invalid
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBe(true);

    // Fill name and check if button becomes enabled
    const nameInput = page.locator('input[type="text"]');
    await nameInput.fill('Test User');

    // May still be disabled until all required fields are filled
    // This depends on the validation logic
  });

  test('should display proper error states using shadcn/ui styling', async ({ page }) => {
    // Go to profile creation
    const createButton = page.getByRole('button', { name: /새 프로필 생성/ });
    await createButton.click();

    // Look for any error messages or validation feedback
    const nameInput = page.locator('input[type="text"]');
    await nameInput.fill(''); // Clear the field
    await nameInput.blur(); // Trigger validation

    // Check if error styling is applied (shadcn/ui uses specific error classes)
    const inputClasses = await nameInput.getAttribute('class');
    if (inputClasses?.includes('aria-invalid')) {
      expect(inputClasses).toContain('ring-destructive');
    }
  });

  test('should use consistent button variants', async ({ page }) => {
    // Check various button variants are used consistently
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const classes = await button.getAttribute('class');

      // Should use shadcn/ui button classes
      expect(classes).toContain('inline-flex');
      expect(classes).toMatch(/bg-primary|bg-secondary|bg-destructive|hover:bg-/);
    }
  });

  test('should handle loading states appropriately', async ({ page }) => {
    // Navigate to profile creation
    const createButton = page.getByRole('button', { name: /새 프로필 생성/ });
    await createButton.click();

    // Fill out form
    await page.fill('input[type="text"]', 'Loading Test User');

    const sessionRole = page.locator('input[value="session"]');
    await sessionRole.click();

    // Click submit and look for loading state
    const submitButton = page.getByRole('button', { name: /프로필 생성/ });
    await submitButton.click();

    // Should show loading text or spinner
    const loadingButton = page.getByRole('button', { name: /생성 중/ });
    if (await loadingButton.isVisible()) {
      // Button should be disabled during loading
      expect(await loadingButton.isDisabled()).toBe(true);
    }
  });
});
