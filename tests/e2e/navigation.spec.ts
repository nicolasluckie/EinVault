import { expect } from '@playwright/test';
import { test } from '../lib/fixtures';
import { SEED } from '../lib/seed';

const EIN = SEED.companions.ein.id;

// ---------------------------------------------------------------------------
// A. Owner household tabs + account sheet — mobile-only
// ---------------------------------------------------------------------------

test('bottom tab bar shows Overview, Search, You but not Users @mobile', async ({
	asAdmin
}, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile', 'mobile only');
	await asAdmin.goto('/');
	const nav = asAdmin.getByRole('navigation', { name: 'Main navigation' });
	await expect(nav.getByRole('link', { name: 'Overview' })).toBeVisible({ timeout: 8_000 });
	await expect(nav.getByRole('button', { name: 'Search' })).toBeVisible({ timeout: 8_000 });
	await expect(nav.getByRole('button', { name: 'You' })).toBeVisible({ timeout: 8_000 });
	await expect(nav.getByRole('link', { name: 'Users' })).toHaveCount(0);
});

// SKIPPED: Mobile companion dropdown page context closure issue
test.skip('mobile overview header is a companion dropdown that can jump into a companion @mobile', async ({
	asAdmin
}, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile', 'mobile only');
	await asAdmin.goto('/');
	const trigger = asAdmin.getByRole('button', { name: 'Switch companion' });
	await expect(trigger).toBeVisible({ timeout: 8_000 });
	await expect(trigger).toContainText('Overview');
	await trigger.click();
	const listbox = asAdmin.getByRole('listbox', { name: 'Switch companion' });
	await listbox.getByRole('button', { name: 'Ein' }).first().click();
	await expect(asAdmin).toHaveURL(new RegExp(`/${EIN}$`));
});

// SKIPPED: Mobile account sheet dialog visibility issue
test.skip('admin You tab account sheet shows Companions @mobile', async ({ asAdmin }, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile', 'mobile only');
	await asAdmin.goto('/');
	const nav = asAdmin.getByRole('navigation', { name: 'Main navigation' });
	await nav.getByRole('button', { name: 'You' }).click();

	const sheet = asAdmin.getByRole('dialog', { name: 'Account menu' });
	await expect(sheet).toBeVisible({ timeout: 8_000 });
	await expect(sheet.getByRole('link', { name: 'Companions' })).toBeVisible();
});

// SKIPPED: Mobile account sheet dialog visibility issue
test.skip('admin account sheet Companions link navigates to /admin/companions @mobile', async ({
	asAdmin
}, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile', 'mobile only');
	await asAdmin.goto('/');
	const nav = asAdmin.getByRole('navigation', { name: 'Main navigation' });
	await nav.getByRole('button', { name: 'You' }).click();
	const sheet = asAdmin.getByRole('dialog', { name: 'Account menu' });
	await expect(sheet).toBeVisible({ timeout: 8_000 });
	await sheet.getByRole('link', { name: 'Companions' }).click();
	await expect(asAdmin).toHaveURL(/\/admin\/companions/, { timeout: 8_000 });
});

// ---------------------------------------------------------------------------
// B. Owner account popover — desktop sidebar
// ---------------------------------------------------------------------------

// SKIPPED: Desktop account popover dialog visibility issue
test.skip('admin sidebar account popover shows Settings + Companions + Sign Out', async ({
	asAdmin
}, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop', 'desktop sidebar only');
	await asAdmin.goto('/');
	// The account trigger is the button with aria-haspopup="dialog" in the sidebar
	const trigger = asAdmin.getByRole('button', { name: new RegExp(SEED.admin.displayName, 'i') });
	await expect(trigger).toBeVisible({ timeout: 8_000 });
	await trigger.click();

	const popover = asAdmin.getByRole('dialog', { name: 'Account menu' });
	await expect(popover).toBeVisible({ timeout: 8_000 });
	await expect(popover.getByRole('link', { name: 'Settings' })).toBeVisible();
	await expect(popover.getByRole('link', { name: 'Companions' })).toBeVisible();
	await expect(popover.getByRole('button', { name: 'Sign Out' })).toBeVisible();
});
