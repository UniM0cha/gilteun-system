import { test, expect } from '@playwright/test';

test.describe('UI Theme and shadcn/ui Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display consistent shadcn/ui themed components on home page', async ({ page }) => {
    // Check if the main card component uses shadcn/ui styling
    const card = page.locator('[data-testid="profile-card"], .max-w-md').first();
    await expect(card).toBeVisible();

    // Verify button styling follows shadcn/ui patterns
    const createButton = page.getByRole('button', { name: /새 프로필 생성|프로필 생성/ });
    await expect(createButton).toBeVisible();

    // Check if button has shadcn/ui classes
    const buttonClasses = await createButton.getAttribute('class');
    expect(buttonClasses).toContain('inline-flex');
    expect(buttonClasses).toContain('items-center');
    expect(buttonClasses).toContain('justify-center');
  });

  test('should use semantic color tokens instead of custom colors', async ({ page }) => {
    // Navigate to worship page if possible
    const createButton = page.getByRole('button', { name: /새 프로필 생성/ });
    if (await createButton.isVisible()) {
      await createButton.click();

      // Fill out profile form
      await page.fill('input[type="text"]', 'Test User');

      // Select role
      const sessionRadio = page.locator('input[value="session"]');
      await sessionRadio.click();

      // Continue to next step
      const submitButton = page.getByRole('button', { name: /프로필 생성|계속/ });
      await submitButton.click();
    }

    // Look for any elements using deprecated color classes
    const grayTextElements = page.locator('[class*="text-gray-"]');
    const count = await grayTextElements.count();

    // Should use semantic tokens like text-muted-foreground instead
    expect(count).toBe(0);
  });

  test('should have proper focus states for accessibility', async ({ page }) => {
    // Test button focus states
    const firstButton = page.getByRole('button').first();
    await firstButton.focus();

    // Check if focus styles are applied (shadcn/ui includes focus-visible classes)
    const buttonClasses = await firstButton.getAttribute('class');
    expect(buttonClasses).toContain('focus-visible');
  });

  test('should display consistent card styling', async ({ page }) => {
    const cards = page.locator('.border, [class*="card"]');
    const firstCard = cards.first();

    if (await firstCard.isVisible()) {
      const cardClasses = await firstCard.getAttribute('class');
      // Should use shadcn/ui card classes
      expect(cardClasses).toMatch(/bg-card|border|rounded/);
    }
  });

  test('should handle dark mode properly', async ({ page }) => {
    // Check if dark mode toggle exists or if system respects dark mode
    const body = page.locator('body');
    const bodyClasses = await body.getAttribute('class');

    // Should support dark mode classes
    if (bodyClasses?.includes('dark')) {
      // In dark mode, check if components adapt properly
      const cards = page.locator('[class*="bg-card"], [class*="bg-background"]');
      await expect(cards.first()).toBeVisible();
    }
  });

  test('should use consistent spacing and sizing', async ({ page }) => {
    // Check if components use consistent Tailwind spacing
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      for (let i = 0; i < Math.min(buttonCount, 3); i++) {
        const button = buttons.nth(i);
        const classes = await button.getAttribute('class');

        // Should use consistent padding classes
        expect(classes).toMatch(/px-\d+|py-\d+|p-\d+/);
      }
    }
  });

  test('should render icons consistently', async ({ page }) => {
    // Look for any SVG icons (likely from lucide-react)
    const icons = page.locator('svg');
    const iconCount = await icons.count();

    if (iconCount > 0) {
      const firstIcon = icons.first();
      const iconClasses = await firstIcon.getAttribute('class');

      // Should use consistent icon sizing
      expect(iconClasses).toMatch(/h-\d+|w-\d+|size-\d+/);
    }
  });
});
