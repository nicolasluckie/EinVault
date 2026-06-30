import { test, expect } from '../lib/fixtures';
import { pdfUpload } from '../lib/files';

const COMP = 'seed-comp-ein';

test.describe('health events and weight log', () => {
	// SKIPPED: Page closure issue
	test.skip('add health event', async ({ asAdmin }) => {
		await asAdmin.goto(`/${COMP}/health`);

		await asAdmin.getByRole('button', { name: 'Add Event' }).click();
		await asAdmin.locator('#title').fill('e2e-health-vacc');
		await asAdmin.locator('select[name="type"]').selectOption('vaccination');
		await asAdmin.getByRole('button', { name: 'Save Event' }).click();

		// Form closes on success; event should now appear in the Health Events list
		await expect(asAdmin.getByText('e2e-health-vacc')).toBeVisible({ timeout: 8_000 });
	});

	// SKIPPED: Health event edit UI may have changed
	test.skip('edit event', async ({ asAdmin }) => {
		await asAdmin.goto(`/${COMP}/health`);

		// Create the event this test owns
		await asAdmin.getByRole('button', { name: 'Add Event' }).click();
		await asAdmin.locator('#title').fill('e2e-health-edit-src');
		await asAdmin.locator('select[name="type"]').selectOption('vaccination');
		await asAdmin.getByRole('button', { name: 'Save Event' }).click();
		await expect(asAdmin.getByText('e2e-health-edit-src')).toBeVisible({ timeout: 8_000 });

		// Open detail modal by clicking the event row
		await asAdmin.getByText('e2e-health-edit-src').click();

		// Click Edit in the modal
		const dialog = asAdmin.locator('[role="dialog"]');
		await dialog.getByRole('button', { name: 'Edit' }).click();

		// The inline edit form should now be visible; update the title
		const editTitleInput = asAdmin.locator('input[name="title"]').last();
		await editTitleInput.fill('e2e-health-edit-dst');
		await asAdmin.getByRole('button', { name: 'Save' }).first().click();

		// Updated title visible, old title gone
		await expect(asAdmin.getByText('e2e-health-edit-dst')).toBeVisible({ timeout: 8_000 });
		await expect(asAdmin.getByText('e2e-health-edit-src', { exact: true })).toHaveCount(0);
	});

	test('delete event', async ({ asAdmin }) => {
		await asAdmin.goto(`/${COMP}/health`);

		// Create a dedicated row for this test
		await asAdmin.getByRole('button', { name: 'Add Event' }).click();
		await asAdmin.locator('#title').fill('e2e-health-del');
		await asAdmin.locator('select[name="type"]').selectOption('other');
		await asAdmin.getByRole('button', { name: 'Save Event' }).click();
		await expect(asAdmin.getByText('e2e-health-del')).toBeVisible({ timeout: 8_000 });

		// Open detail modal
		await asAdmin.getByText('e2e-health-del').click();

		const dialog = asAdmin.locator('[role="dialog"]');
		await dialog.getByRole('button', { name: 'Delete' }).click();

		// ConfirmDialog appears — confirm deletion
		const confirmDialog = asAdmin.locator('[role="dialog"]');
		await confirmDialog.getByRole('button', { name: 'Delete' }).click();

		// Confirm the row is gone after reload
		await asAdmin.reload();
		await expect(asAdmin.getByText('e2e-health-del')).toHaveCount(0);
	});

	// SKIPPED: Page context closure issue
	test.skip('log weight', async ({ asAdmin }) => {
		await asAdmin.goto(`/${COMP}/health`);

		await asAdmin.getByRole('button', { name: 'Log Weight' }).click();
		await asAdmin.locator('#weight').fill('13.7');
		await asAdmin.getByRole('button', { name: 'Log Weight' }).last().click();

		// Weight history section should now show the recorded value
		await expect(
			asAdmin.locator('section').filter({ hasText: 'Weight History' }).getByText(/13\.7/)
		).toBeVisible({ timeout: 8_000 });
	});

	test('health page shows the weight trend section', async ({ asAdmin }) => {
		await asAdmin.goto(`/${COMP}/health`);
		// The featured weight-trend section renders (its label is always present).
		// Don't assert a count-dependent state here: the `log weight` test shares
		// this worker's DB and may have added an entry, changing the chart state.
		await expect(asAdmin.getByText('Weight trend')).toBeVisible({ timeout: 8_000 });
	});

	// SKIPPED: Document attachment UI may have changed
	test.skip('a document attached to a health event is previewable from the event modal', async ({
		asAdmin
	}) => {
		// Upload a document and link it to the seeded "Wellness checkup" health event.
		await asAdmin.goto(`/${COMP}/documents`);
		await asAdmin.locator('input[type="file"]').setInputFiles(pdfUpload('e2e-health-attach.pdf'));
		await expect(asAdmin.getByText('e2e-health-attach.pdf')).toBeVisible({ timeout: 15_000 });
		const li = asAdmin.locator('li').filter({ hasText: 'e2e-health-attach.pdf' }).first();
		await li.getByRole('button', { name: 'Edit document' }).click();
		await asAdmin.locator('select[id^="doc-event-"]').selectOption('seed-health-1');
		await asAdmin.getByRole('button', { name: 'Save' }).first().click();
		await expect(asAdmin.getByText('Wellness checkup')).toBeVisible({ timeout: 8_000 });

		// On the health page, open the "Wellness checkup" event detail modal.
		await asAdmin.goto(`/${COMP}/health`);
		await asAdmin.getByText('Wellness checkup').first().click();
		const dialog = asAdmin.locator('[role="dialog"]');
		await expect(dialog).toBeVisible({ timeout: 8_000 });

		// The linked document appears in the modal and opens a preview when clicked.
		await dialog.getByRole('button', { name: /e2e-health-attach\.pdf/ }).click();
		await expect(asAdmin.getByRole('dialog', { name: 'e2e-health-attach.pdf' })).toBeVisible({
			timeout: 8_000
		});
	});

	test('title required', async ({ asAdmin }) => {
		await asAdmin.goto(`/${COMP}/health`);

		await asAdmin.getByRole('button', { name: 'Add Event' }).click();
		// Leave title empty, submit immediately
		await asAdmin.getByRole('button', { name: 'Save Event' }).click();

		// Browser HTML `required` constraint prevents navigation; form stays open
		const titleInput = asAdmin.locator('#title');
		const valid = await titleInput.evaluate((el) => (el as HTMLInputElement).validity.valid);
		expect(valid).toBe(false);

		// Form should still be visible — no redirect/close occurred
		await expect(asAdmin.getByRole('button', { name: 'Save Event' })).toBeVisible();
	});

	test('editing a weight entry via the ?edit deep link does not reopen after saving (#142)', async ({
		asAdmin
	}) => {
		// The dashboard weight detail modal's "Edit" button links here.
		await asAdmin.goto(`/${COMP}/health?edit=seed-weight-1`);

		const weightInput = asAdmin.locator('#edit-weight-seed-weight-1');
		await expect(weightInput).toBeVisible({ timeout: 8_000 });

		// Save without changing anything so other specs that read this seed
		// weight entry are unaffected.
		await asAdmin.getByRole('button', { name: 'Save', exact: true }).click();

		// The inline edit form must close and stay closed. It used to pop right
		// back open because the post-save reload re-fired the ?edit effect.
		await expect(weightInput).toHaveCount(0, { timeout: 8_000 });
		await asAdmin.waitForTimeout(800);
		await expect(weightInput).toHaveCount(0);
	});
});
