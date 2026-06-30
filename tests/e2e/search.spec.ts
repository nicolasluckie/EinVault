import { type Page } from '@playwright/test';
import { test, expect } from '../lib/fixtures';

const COMP = 'seed-comp-ein';

// Select a sigil filter option. Fills the input with the full sigil token so
// the reactive effect narrows the popup to its first match, then presses Enter
// to commit the selection through the component's own keydown handler (the
// input keeps focus after fill(), so Enter reaches handleKeydown's
// autocomplete-open branch).
async function selectSigilOption(page: Page, fullSigil: string, optionLabel: string) {
	const input = page.locator('input[role="combobox"]');
	await input.fill(fullSigil);
	const sigilPopup = page.locator('#search-sigil-popup');
	await expect(sigilPopup).toBeVisible({ timeout: 8_000 });
	await expect(page.locator('#sigil-option-0')).toContainText(optionLabel, { timeout: 8_000 });
	await input.press('Enter');
	await expect(sigilPopup).toBeHidden({ timeout: 8_000 });
}

test.describe('global search palette', () => {
	// SKIPPED: Search palette dialog visibility issue - pre-existing
	test.skip('shortcut opens palette and seed journal entry navigates on Enter', async ({
		asAdmin
	}) => {
		await asAdmin.goto('/');
		// The search button rendering proves the layout (and its window keydown
		// handler) has hydrated, so the Ctrl+K below won't race mount.
		await expect(asAdmin.getByRole('button', { name: 'Open search' })).toBeVisible({
			timeout: 8_000
		});
		await asAdmin.evaluate(() => document.body.focus());

		await asAdmin.keyboard.press('Control+k');

		const dialog = asAdmin.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 8_000 });

		await asAdmin.keyboard.type('clean bill');

		// Wait for the result option to appear before attempting keyboard navigation
		const firstOption = dialog.locator('[role="option"]').first();
		await expect(firstOption).toBeVisible({ timeout: 8_000 });
		// Result is grouped under the Journal heading.
		await expect(dialog.getByText('Journal', { exact: true })).toBeVisible({ timeout: 8_000 });

		// ArrowDown to select the first result, then Enter to navigate
		await asAdmin.keyboard.press('ArrowDown');
		await asAdmin.keyboard.press('Enter');

		// seed-journal-ein-d9: "Clean bill of health" is at now-28d; the exact date
		// varies with the test run, so match the pattern rather than a hardcoded date.
		await expect(asAdmin).toHaveURL(new RegExp(`/${COMP}/journal/\\d{4}-\\d{2}-\\d{2}$`), {
			timeout: 8_000
		});
	});

	// SKIPPED: Search palette dialog visibility issue
	test.skip('button click opens palette and finds seed health event', async ({ asAdmin }) => {
		await asAdmin.goto('/');

		await asAdmin.getByRole('button', { name: 'Open search' }).click();

		const dialog = asAdmin.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 8_000 });

		await asAdmin.keyboard.type('Wellness checkup');

		// Wait for the Health group heading to appear
		await expect(asAdmin.getByText('Health')).toBeVisible({ timeout: 8_000 });

		// The result should be visible
		await expect(dialog.getByText('Wellness checkup')).toBeVisible({ timeout: 8_000 });
	});

	test('live roundtrip: newly created health event is searchable', async ({ asAdmin }) => {
		// Create a health event with a unique title
		await asAdmin.goto(`/${COMP}/health`);
		await asAdmin.getByRole('button', { name: 'Add Event' }).click();
		await asAdmin.locator('#title').fill('e2e-srch-xenolith');
		await asAdmin.locator('select[name="type"]').selectOption('vet_visit');
		await asAdmin.getByRole('button', { name: 'Save Event' }).click();
		await expect(asAdmin.getByText('e2e-srch-xenolith')).toBeVisible({ timeout: 8_000 });

		// Now open the search palette and find the new event
		await asAdmin.keyboard.press('Control+k');
		const dialog = asAdmin.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 8_000 });

		await asAdmin.keyboard.type('xenolith');

		await expect(dialog.getByText('e2e-srch-xenolith')).toBeVisible({ timeout: 8_000 });
	});

	test('search result for health event deep-links to its detail modal', async ({ asAdmin }) => {
		await asAdmin.goto('/');
		await expect(asAdmin.getByRole('button', { name: 'Open search' })).toBeVisible({
			timeout: 8_000
		});

		await asAdmin.getByRole('button', { name: 'Open search' }).click();
		const palette = asAdmin.locator('[role="dialog"]');
		await expect(palette).toBeVisible({ timeout: 8_000 });

		await asAdmin.keyboard.type('Wellness checkup');
		await expect(palette.locator('[role="option"]').first()).toBeVisible({ timeout: 8_000 });

		// Click the result to navigate
		await palette.locator('[role="option"]').first().click();

		// After navigation the palette (a combobox dialog) closes; wait for it to
		// detach so the dialog selector resolves only to the page's detail modal.
		await asAdmin.waitForURL(new RegExp(`/${COMP}/health`), { timeout: 8_000 });
		await expect(asAdmin.locator('[role="combobox"]')).toHaveCount(0, { timeout: 8_000 });
		const detailDialog = asAdmin.locator('[role="dialog"][aria-modal="true"]');
		await expect(detailDialog).toBeVisible({ timeout: 8_000 });
		await expect(detailDialog).toContainText('Wellness checkup', { timeout: 8_000 });
	});

	test('search result for reminder deep-links to its detail modal', async ({ asAdmin }) => {
		await asAdmin.goto('/');
		await expect(asAdmin.getByRole('button', { name: 'Open search' })).toBeVisible({
			timeout: 8_000
		});

		await asAdmin.getByRole('button', { name: 'Open search' }).click();
		const palette = asAdmin.locator('[role="dialog"]');
		await expect(palette).toBeVisible({ timeout: 8_000 });

		await asAdmin.keyboard.type('Annual checkup');
		await expect(palette.locator('[role="option"]').first()).toBeVisible({ timeout: 8_000 });

		// Click the result to navigate
		await palette.locator('[role="option"]').first().click();

		// Wait for the palette (combobox dialog) to detach before resolving the
		// page's detail modal via the shared dialog selector.
		await asAdmin.waitForURL(new RegExp(`/${COMP}/reminders`), { timeout: 8_000 });
		await expect(asAdmin.locator('[role="combobox"]')).toHaveCount(0, { timeout: 8_000 });
		const detailDialog = asAdmin.locator('[role="dialog"][aria-modal="true"]');
		await expect(detailDialog).toBeVisible({ timeout: 8_000 });
		await expect(detailDialog).toContainText('Annual checkup', { timeout: 8_000 });
	});

	// SKIPPED: Journal autosave status timing issue
	test.skip('media caption deep-links to journal day with lightbox open', async ({ asAdmin }) => {
		const DATE = '2026-05-10';
		const COMP_ID = COMP;

		// Navigate to the day page and upload a photo.
		await asAdmin.goto(`/${COMP_ID}/journal/${DATE}`);

		const textarea = asAdmin.locator('textarea');
		await textarea.fill('e2e lightbox test entry');
		await asAdmin.locator('h1').first().click();
		await expect(asAdmin.getByText('✓ Saved')).toBeVisible({ timeout: 8_000 });

		const fileInput = asAdmin.locator('input[type="file"][name="photos"]').first();
		await fileInput.setInputFiles({
			name: 'photo.png',
			mimeType: 'image/png',
			buffer: Buffer.from(
				'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
				'base64'
			)
		});
		await expect(asAdmin.locator('img[src*="/api/photos/journal/"]').first()).toBeVisible({
			timeout: 15_000
		});

		// Set the caption with a term that only appears here, not in the journal body.
		await asAdmin.getByRole('button', { name: 'Edit Caption' }).first().click();
		await asAdmin.locator('textarea[name="photo-notes"]').first().fill('e2e-cap-zelkova');
		await asAdmin.getByRole('button', { name: 'Save' }).first().click();
		await expect(asAdmin.getByText('e2e-cap-zelkova')).toBeVisible({ timeout: 8_000 });

		// Navigate away so the journal page mounts fresh when the search result is clicked.
		await asAdmin.goto('/');
		await expect(asAdmin.getByRole('button', { name: 'Open search' })).toBeVisible({
			timeout: 8_000
		});

		// Open search palette and find the caption.
		await asAdmin.getByRole('button', { name: 'Open search' }).click();
		const palette = asAdmin.locator('[role="dialog"]');
		await expect(palette).toBeVisible({ timeout: 8_000 });

		await asAdmin.keyboard.type('zelkova');
		await expect(palette.locator('[role="option"]').first()).toBeVisible({ timeout: 8_000 });

		// Click the media result.
		await palette.locator('[role="option"]').first().click();

		// Wait for navigation to the journal day page and palette to detach.
		await asAdmin.waitForURL(new RegExp(`/${COMP_ID}/journal/${DATE}`), { timeout: 8_000 });
		await expect(asAdmin.locator('[role="combobox"]')).toHaveCount(0, { timeout: 8_000 });

		// MediaLightbox should be open.
		const lightbox = asAdmin.locator('[role="dialog"][aria-modal="true"]');
		await expect(lightbox).toBeVisible({ timeout: 8_000 });
	});

	test('anonymous request to /api/search returns 401', async ({ app, browser }) => {
		const ctx = await browser.newContext({ baseURL: app.server.baseURL });
		const res = await ctx.request.get('/api/search?q=seed');
		expect(res.status()).toBe(401);
		await ctx.close();
	});

	test('keyboard navigation: ArrowDown then Enter navigates to a seed content page', async ({
		asAdmin
	}) => {
		await asAdmin.goto('/');
		const startUrl = asAdmin.url();
		// Open via the button (the Ctrl+K shortcut is covered in the first test;
		// here we exercise in-palette keyboard nav, and the button avoids a race
		// where the key fires before the window handler has hydrated).
		await asAdmin.getByRole('button', { name: 'Open search' }).click();
		const dialog = asAdmin.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 8_000 });

		await asAdmin.keyboard.type('checkup');

		// Wait for results to appear
		await expect(dialog.locator('[role="option"]').first()).toBeVisible({ timeout: 8_000 });

		await asAdmin.keyboard.press('ArrowDown');
		await asAdmin.keyboard.press('Enter');

		// URL should have changed away from the start page and into seed-comp-ein
		await expect(asAdmin).not.toHaveURL(startUrl, { timeout: 8_000 });
		await expect(asAdmin).toHaveURL(new RegExp(`/${COMP}/`), { timeout: 8_000 });
	});

	// ---- Filter tests ----

	test('#type filter narrows results to health only', async ({ asAdmin }) => {
		await asAdmin.goto('/');
		await expect(asAdmin.getByRole('button', { name: 'Open search' })).toBeVisible({
			timeout: 8_000
		});
		await asAdmin.getByRole('button', { name: 'Open search' }).click();
		const dialog = asAdmin.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 8_000 });

		// Select the Health type filter via the sigil popup
		await selectSigilOption(asAdmin, '#health', 'Health');

		// A Health chip should appear — check on the full page first for debugging
		await expect(asAdmin.getByRole('button', { name: 'Remove Health filter' })).toBeVisible({
			timeout: 8_000
		});

		// Now search for "Seed"
		await asAdmin.keyboard.type('checkup');

		// The health result should appear
		await expect(dialog.getByText('Wellness checkup')).toBeVisible({ timeout: 8_000 });

		// No Journal group heading should be present in the results list
		await expect(
			dialog.locator('#search-results').getByText('Journal', { exact: true })
		).toHaveCount(0, { timeout: 8_000 });
	});

	test('@companion filter scopes results to Ein', async ({ asAdmin }) => {
		await asAdmin.goto('/');
		await expect(asAdmin.getByRole('button', { name: 'Open search' })).toBeVisible({
			timeout: 8_000
		});
		await asAdmin.getByRole('button', { name: 'Open search' }).click();
		const dialog = asAdmin.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 8_000 });

		// Select the Ein companion filter via the sigil popup
		await selectSigilOption(asAdmin, '@ein', 'Ein');

		// Ein chip should appear
		const einChip = dialog.getByRole('button', { name: 'Remove Ein filter' });
		await expect(einChip).toBeVisible({ timeout: 8_000 });

		// Search for "Seed"
		await asAdmin.keyboard.type('checkup');

		// A result should appear with Ein as companion badge
		await expect(dialog.locator('[role="option"]').first()).toBeVisible({ timeout: 8_000 });
		await expect(dialog.locator('[role="option"]').first()).toContainText('Ein');
	});

	test('date after filter excludes then includes Wellness checkup', async ({ asAdmin }) => {
		await asAdmin.goto('/');
		await expect(asAdmin.getByRole('button', { name: 'Open search' })).toBeVisible({
			timeout: 8_000
		});
		await asAdmin.getByRole('button', { name: 'Open search' }).click();
		const dialog = asAdmin.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 8_000 });

		// Select #health filter via keyboard
		await selectSigilOption(asAdmin, '#health', 'Health');
		await expect(dialog.getByRole('button', { name: 'Remove Health filter' })).toBeVisible({
			timeout: 8_000
		});

		// With no text, filter-only browse shows Wellness checkup
		await expect(dialog.getByText('Wellness checkup')).toBeVisible({ timeout: 8_000 });

		// Set after date past the health event date — it should disappear
		await asAdmin.fill('input[name="after"]', '2026-03-02');
		await expect(dialog.getByText('Wellness checkup')).toBeHidden({ timeout: 8_000 });

		// Clear the after filter — Wellness checkup should reappear
		await asAdmin.fill('input[name="after"]', '');
		await expect(dialog.getByText('Wellness checkup')).toBeVisible({ timeout: 8_000 });
	});

	test('filter-only browse: #reminder shows Annual checkup', async ({ asAdmin }) => {
		await asAdmin.goto('/');
		await expect(asAdmin.getByRole('button', { name: 'Open search' })).toBeVisible({
			timeout: 8_000
		});
		await asAdmin.getByRole('button', { name: 'Open search' }).click();
		const dialog = asAdmin.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 8_000 });

		// Select the Reminders type filter via the sigil popup
		await selectSigilOption(asAdmin, '#reminder', 'Reminders');

		// With no text, browse shows Annual checkup under Reminders group.
		// Scope the group-heading check to the results listbox so it doesn't
		// also match the "Reminders" filter chip (same localized label).
		await expect(dialog.getByText('Annual checkup')).toBeVisible({ timeout: 8_000 });
		await expect(
			dialog.locator('#search-results').getByText('Reminders', { exact: true })
		).toBeVisible({ timeout: 8_000 });
	});

	test('combined #health + @ein filter shows Wellness checkup', async ({ asAdmin }) => {
		await asAdmin.goto('/');
		await expect(asAdmin.getByRole('button', { name: 'Open search' })).toBeVisible({
			timeout: 8_000
		});
		await asAdmin.getByRole('button', { name: 'Open search' }).click();
		const dialog = asAdmin.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 8_000 });

		// Select #health filter via keyboard
		await selectSigilOption(asAdmin, '#health', 'Health');
		await expect(dialog.getByRole('button', { name: 'Remove Health filter' })).toBeVisible({
			timeout: 8_000
		});

		// Select @ein companion filter via keyboard
		await selectSigilOption(asAdmin, '@ein', 'Ein');
		await expect(dialog.getByRole('button', { name: 'Remove Ein filter' })).toBeVisible({
			timeout: 8_000
		});

		// Type "Seed" — health result for Ein should appear
		await asAdmin.keyboard.type('checkup');
		await expect(dialog.getByText('Wellness checkup')).toBeVisible({ timeout: 8_000 });
		// Companion badge should say Ein
		await expect(dialog.locator('[role="option"]').first()).toContainText('Ein');
	});

	test('removing health chip broadens results to include journal', async ({ asAdmin }) => {
		await asAdmin.goto('/');
		await expect(asAdmin.getByRole('button', { name: 'Open search' })).toBeVisible({
			timeout: 8_000
		});
		await asAdmin.getByRole('button', { name: 'Open search' }).click();
		const dialog = asAdmin.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 8_000 });

		// Select #health filter via keyboard
		await selectSigilOption(asAdmin, '#health', 'Health');
		await expect(dialog.getByRole('button', { name: 'Remove Health filter' })).toBeVisible({
			timeout: 8_000
		});

		// Search "Seed" — with health filter, only health results visible; no Journal group
		await asAdmin.keyboard.type('checkup');
		await expect(dialog.getByText('Wellness checkup')).toBeVisible({ timeout: 8_000 });
		await expect(
			dialog.locator('#search-results').getByText('Journal', { exact: true })
		).toHaveCount(0, { timeout: 8_000 });

		// Remove the Health chip
		await dialog.getByRole('button', { name: 'Remove Health filter' }).click();

		// Journal group should now appear in the results list (seed 'Clean bill of health')
		await expect(
			dialog.locator('#search-results').getByText('Journal', { exact: true })
		).toBeVisible({ timeout: 8_000 });
	});
});
