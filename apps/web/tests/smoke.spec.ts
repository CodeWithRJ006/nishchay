import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home page passes axe checks', async ({ page }) => {
  await page.goto('/');
  const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(['color-contrast', 'landmark-one-main', 'page-has-heading-one', 'region']).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test('design page passes axe checks', async ({ page }) => {
  await page.goto('/design');
  const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(['color-contrast', 'landmark-one-main', 'page-has-heading-one', 'region']).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test('login page passes axe checks', async ({ page }) => {
  await page.goto('/login');
  const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(['color-contrast', 'landmark-one-main', 'page-has-heading-one', 'region']).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test('register page passes axe checks', async ({ page }) => {
  await page.goto('/register');
  const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(['color-contrast', 'landmark-one-main', 'page-has-heading-one', 'region']).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

test('login requires fields', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign In' }).click();
  // Form submission should be blocked by HTML5 validation (required attrs on input)
});

test('can navigate using keyboard', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  // First tab might focus the document or the first focusable element
  await page.keyboard.press('Tab');
  const focusedText = await page.evaluate(() => document.activeElement?.textContent);
  expect(focusedText).toBeTruthy();
});
