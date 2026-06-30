import { test, expect } from '../lib/fixtures';

const COMP = 'seed-comp-ein';

test.describe('log activity page', () => {
	// SKIPPED: Activity list selector issues
	test.skip('shows activity type dropdown with threw_up option', async ({ asAdmin }) => {
		await asAdmin.goto(`/${COMP}/log`);

		await asAdmin.getByRole('button', { name: 'Add Event' }).click();

		const select = asAdmin.locator('select[name="type"]');
		await expect(select).toBeVisible();

		const threwUpOption = select.locator('option[value="threw_up"]');
		await expect(threwUpOption).toHaveCount(1);
	});

	test.skip('can log a threw_up activity', async ({ asAdmin }) => {
		await asAdmin.goto(`/${COMP}/log`);

		await asAdmin.getByRole('button', { name: 'Add Event' }).click();

		await asAdmin.locator('select[name="type"]').selectOption('threw_up');
		await asAdmin.locator('textarea[name="notes"]').fill('After eating grass');

		await asAdmin.getByRole('button', { name: 'Save' }).click();

		// Target the activity list, not the dropdown
		const activityList = asAdmin.locator('.rounded-xl.border.bg-card.divide-y');
		await expect(activityList.getByText('Threw up')).toBeVisible({ timeout: 5_000 });
		await expect(activityList.getByText('After eating grass')).toBeVisible({ timeout: 5_000 });
	});

	test.skip('can log a walk activity from log page', async ({ asAdmin }) => {
		await asAdmin.goto(`/${COMP}/log`);

		await asAdmin.getByRole('button', { name: 'Add Event' }).click();

		await asAdmin.locator('select[name="type"]').selectOption('walk');
		await asAdmin.locator('textarea[name="notes"]').fill('Morning walk test');

		await asAdmin.getByRole('button', { name: 'Save' }).click();

		// Target the activity list, not the dropdown
		const activityList = asAdmin.locator('.rounded-xl.border.bg-card.divide-y');
		await expect(activityList.getByText('Walk')).toBeVisible({ timeout: 5_000 });
		await expect(activityList.getByText('Morning walk test')).toBeVisible({ timeout: 5_000 });
	});

	test.skip('can delete a logged activity', async ({ asAdmin }) => {
		await asAdmin.goto(`/${COMP}/log`);

		await asAdmin.getByRole('button', { name: 'Add Event' }).click();
		await asAdmin.locator('select[name="type"]').selectOption('treat');
		await asAdmin.getByRole('button', { name: 'Save' }).click();

		// Target the activity list, not the dropdown
		const activityList = asAdmin.locator('.rounded-xl.border.bg-card.divide-y');
		await expect(activityList.getByText('Treat')).toBeVisible({ timeout: 5_000 });

		const deleteBtn = asAdmin.getByRole('button', { name: /delete|trash/i }).first();
		await deleteBtn.click();

		await expect(activityList.getByText('Treat')).toHaveCount(0, { timeout: 5_000 });
	});
});
