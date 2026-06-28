import { expect } from '@playwright/test';
import { test } from '../lib/fixtures';
import { SEED } from '../lib/seed';

const EIN = SEED.companions.ein.id;

// ---------------------------------------------------------------------------
// A. Owner household tabs + account sheet — mobile-only
// ---------------------------------------------------------------------------

test('bottom tab bar shows Overview, Search, You but not Users @mobile', async ({
	asMember
}, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile', 'mobile only');
	await asMember.goto('/');
	const nav = asMember.getByRole('navigation', { name: 'Main navigation' });
	await expect(nav.getByRole('link', { name: 'Overview' })).toBeVisible({ timeout: 8_000 });
	await expect(nav.getByRole('button', { name: 'Search' })).toBeVisible({ timeout: 8_000 });
	await expect(nav.getByRole('button', { name: 'You' })).toBeVisible({ timeout: 8_000 });
	await expect(nav.getByRole('link', { name: 'Users' })).toHaveCount(0);
});

test('mobile overview header is a companion dropdown that can jump into a companion @mobile', async ({
	asMember
}, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile', 'mobile only');
	await asMember.goto('/');
	const trigger = asMember.getByRole('button', { name: 'Switch companion' });
	await expect(trigger).toBeVisible({ timeout: 8_000 });
	await expect(trigger).toContainText('Overview');
	await trigger.click();
	const listbox = asMember.getByRole('listbox', { name: 'Switch companion' });
	await listbox.getByRole('button', { name: 'Ein' }).first().click();
	await expect(asMember).toHaveURL(new RegExp(`/${EIN}$`));
});

test('member You tab opens account sheet with Settings + Sign Out only @mobile', async ({
	asMember
}, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile', 'mobile only');
	await asMember.goto('/');
	const nav = asMember.getByRole('navigation', { name: 'Main navigation' });
	await nav.getByRole('button', { name: 'You' }).click();

	const sheet = asMember.getByRole('dialog', { name: 'Account menu' });
	await expect(sheet).toBeVisible({ timeout: 8_000 });
	await expect(sheet.getByRole('link', { name: 'Settings' })).toBeVisible();
	await expect(sheet.getByRole('button', { name: 'Sign Out' })).toBeVisible();
	// Admin-only entries must not appear for a member
	await expect(sheet.getByRole('link', { name: 'Users' })).toHaveCount(0);
	await expect(sheet.getByRole('link', { name: 'Companions' })).toHaveCount(0);
});

test('admin You tab account sheet shows Users and Companions @mobile', async ({
	asAdmin
}, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile', 'mobile only');
	await asAdmin.goto('/');
	const nav = asAdmin.getByRole('navigation', { name: 'Main navigation' });
	await nav.getByRole('button', { name: 'You' }).click();

	const sheet = asAdmin.getByRole('dialog', { name: 'Account menu' });
	await expect(sheet).toBeVisible({ timeout: 8_000 });
	await expect(sheet.getByRole('link', { name: 'Users' })).toBeVisible();
	await expect(sheet.getByRole('link', { name: 'Companions' })).toBeVisible();
});

test('admin account sheet Users link navigates to /admin/users @mobile', async ({
	asAdmin
}, testInfo) => {
	test.skip(testInfo.project.name !== 'mobile', 'mobile only');
	await asAdmin.goto('/');
	const nav = asAdmin.getByRole('navigation', { name: 'Main navigation' });
	await nav.getByRole('button', { name: 'You' }).click();
	const sheet = asAdmin.getByRole('dialog', { name: 'Account menu' });
	await expect(sheet).toBeVisible({ timeout: 8_000 });
	await sheet.getByRole('link', { name: 'Users' }).click();
	await expect(asAdmin).toHaveURL(/\/admin\/users/, { timeout: 8_000 });
});

test('admin account sheet Companions link navigates to /admin/companions @mobile', async ({
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

test('admin sidebar account popover shows Settings + Users + Companions + Sign Out', async ({
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
	await expect(popover.getByRole('link', { name: 'Users' })).toBeVisible();
	await expect(popover.getByRole('link', { name: 'Companions' })).toBeVisible();
	await expect(popover.getByRole('button', { name: 'Sign Out' })).toBeVisible();
});

test('member sidebar account popover shows Settings + Sign Out but not Users/Companions', async ({
	asMember
}, testInfo) => {
	test.skip(testInfo.project.name !== 'desktop', 'desktop sidebar only');
	await asMember.goto('/');
	const trigger = asMember.getByRole('button', {
		name: new RegExp(SEED.member.displayName, 'i')
	});
	await expect(trigger).toBeVisible({ timeout: 8_000 });
	await trigger.click();

	const popover = asMember.getByRole('dialog', { name: 'Account menu' });
	await expect(popover).toBeVisible({ timeout: 8_000 });
	await expect(popover.getByRole('link', { name: 'Settings' })).toBeVisible();
	await expect(popover.getByRole('button', { name: 'Sign Out' })).toBeVisible();
	await expect(popover.getByRole('link', { name: 'Users' })).toHaveCount(0);
	await expect(popover.getByRole('link', { name: 'Companions' })).toHaveCount(0);
});
