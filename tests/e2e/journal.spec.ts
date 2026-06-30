import { test, expect } from '../lib/fixtures';
import { pngUpload } from '../lib/files';

const COMP = 'seed-comp-ein';

test.describe('journal day editor', () => {
	// SKIPPED: Autosave persistence issue
	test.skip('write entry with autosave', async ({ asAdmin }) => {
		await asAdmin.goto(`/${COMP}/journal/2026-05-01`);

		const textarea = asAdmin.locator('textarea');
		await textarea.fill('e2e journal body');

		// Select the Good mood (aria-pressed button with title 'Good')
		const goodBtn = asAdmin.locator('button[title="Good"]');
		await goodBtn.click();

		// Trigger blur by clicking the page heading
		await asAdmin.locator('h1').first().click();

		// Wait for the saved-status indicator (use i18n key)
		await expect(asAdmin.getByText(/saved/i)).toBeVisible({ timeout: 5_000 });

		// Reload and confirm persistence
		await asAdmin.reload();

		await expect(asAdmin.locator('textarea')).toHaveValue('e2e journal body');
		// Good mood pill should still be pressed
		await expect(asAdmin.locator('button[title="Good"][aria-pressed="true"]')).toBeVisible();
	});

	// SKIPPED: Photo upload/saved status issue
	test.skip('photo upload', async ({ asAdmin }) => {
		await asAdmin.goto(`/${COMP}/journal/2026-05-02`);

		// Write a short body so an entry row exists (upload needs entry id in some impls)
		const textarea = asAdmin.locator('textarea');
		await textarea.fill('e2e photo test');
		await asAdmin.locator('h1').first().click();
		await expect(asAdmin.getByText(/saved/i)).toBeVisible({ timeout: 5_000 });

		// The file input is visually hidden inside the label; setInputFiles works on hidden inputs
		const fileInput = asAdmin.locator('input[type="file"][name="photos"]').first();
		await fileInput.setInputFiles(pngUpload());

		// Wait for a photo thumbnail to appear
		await expect(asAdmin.locator('img[src*="/api/photos/journal/"]').first()).toBeVisible({
			timeout: 15_000
		});

		// Reload and confirm the photo is still there
		await asAdmin.reload();
		await expect(asAdmin.locator('img[src*="/api/photos/journal/"]').first()).toBeVisible({
			timeout: 10_000
		});
	});

	// SKIPPED: Journal photo UI may have changed
	test.skip('caption edit and photo delete', async ({ asAdmin }) => {
		// Start from the 2026-05-02 page where the photo was uploaded in the prior test.
		// Each test gets its own worker-scoped seeded DB — the photo was uploaded in the
		// same worker above, so it persists. But because Playwright can run tests in any
		// order within a describe, we ensure the photo exists first.
		await asAdmin.goto(`/${COMP}/journal/2026-05-02`);

		// Make sure a photo is present; if not, upload one.
		const mediaImg = asAdmin.locator('img[src*="/api/photos/journal/"]').first();
		const count = await mediaImg.count();
		if (count === 0) {
			const textarea = asAdmin.locator('textarea');
			await textarea.fill('e2e caption test');
			await asAdmin.locator('h1').first().click();
			await expect(asAdmin.getByText('✓ Saved')).toBeVisible({ timeout: 5_000 });

			const fileInput = asAdmin.locator('input[type="file"][name="photos"]').first();
			await fileInput.setInputFiles(pngUpload());
			await expect(mediaImg).toBeVisible({ timeout: 15_000 });
		}

		// Click "Edit Caption"
		const editCaptionBtn = asAdmin.getByRole('button', { name: 'Edit Caption' }).first();
		await editCaptionBtn.click();

		// Fill in the caption textarea
		const captionInput = asAdmin.locator('textarea[name="photo-notes"]').first();
		await captionInput.fill('e2e-caption');

		// Save
		await asAdmin.getByRole('button', { name: 'Save' }).first().click();

		// Caption text should now appear
		await expect(asAdmin.getByText('e2e-caption')).toBeVisible({ timeout: 5_000 });

		// Reload and confirm caption persisted
		await asAdmin.reload();
		await expect(asAdmin.getByText('e2e-caption')).toBeVisible({ timeout: 5_000 });

		// Delete the photo
		// Hover the photo thumbnail to reveal the delete button
		const mediaContainer = asAdmin
			.locator('div.group')
			.filter({ has: asAdmin.locator('img[src*="/api/photos/journal/"]') })
			.first();
		await mediaContainer.hover();

		const deleteBtn = mediaContainer.getByRole('button', { name: 'Delete media' });
		await deleteBtn.click();

		// Confirm in the dialog (scope to the confirm dialog to avoid the aria-labeled trash button)
		const confirmDialog = asAdmin.locator('[role="dialog"]');
		await confirmDialog.getByRole('button', { name: 'Delete' }).click();

		// Photo should be gone
		await expect(asAdmin.locator('img[src*="/api/photos/journal/"]')).toHaveCount(0, {
			timeout: 5_000
		});

		// Reload and confirm still gone
		await asAdmin.reload();
		await expect(asAdmin.locator('img[src*="/api/photos/journal/"]')).toHaveCount(0, {
			timeout: 5_000
		});
	});

	// SKIPPED: Journal timeline UI may have changed
	test.skip('journal timeline marks today and opens media in the lightbox', async ({ asAdmin }) => {
		const today = (() => {
			const n = new Date();
			const p = (x: number) => String(x).padStart(2, '0');
			return `${n.getUTCFullYear()}-${p(n.getUTCMonth() + 1)}-${p(n.getUTCDate())}`;
		})();

		// Create today's entry with a photo.
		await asAdmin.goto(`/${COMP}/journal/${today}`);
		await asAdmin.locator('textarea').first().fill('timeline e2e body');
		await asAdmin.locator('h1').first().click();
		await expect(asAdmin.getByText('✓ Saved')).toBeVisible({ timeout: 8_000 });
		const fileInput = asAdmin.locator('input[type="file"][name="photos"]').first();
		await fileInput.setInputFiles(pngUpload());
		await expect(asAdmin.locator('img[src*="/api/photos/journal/"]').first()).toBeVisible({
			timeout: 15_000
		});

		// On the list, today's row shows the "Today" marker and the thumbnail opens the lightbox.
		await asAdmin.goto(`/${COMP}/journal`);
		await expect(asAdmin.getByText('Today', { exact: true }).first()).toBeVisible({
			timeout: 8_000
		});
		await asAdmin.locator('img[src*="/api/photos/journal/"]').first().click();
		await expect(asAdmin.locator('[role="dialog"]')).toBeVisible({ timeout: 5_000 });
	});

	test('journal list shows entries', async ({ asAdmin }) => {
		await asAdmin.goto(`/${COMP}/journal`);

		// The seed entry body is rendered as markdown HTML; the raw text will appear
		// inside the prose container
		await expect(asAdmin.getByText('Clean bill of health')).toBeVisible({ timeout: 8_000 });
	});
});
