import { test, expect } from '../lib/fixtures';

const COMP = 'seed-comp-ein';

test.describe('log activity page', () => {
	test('shows activity type dropdown with threw_up option', async ({ asMember }) => {
		await asMember.goto(`/${COMP}/log`);

		await asMember.getByRole('button', { name: /add/i }).click();

		const select = asMember.locator('select[name="type"]');
		await expect(select).toBeVisible();

		const threwUpOption = select.locator('option[value="threw_up"]');
		await expect(threwUpOption).toHaveCount(1);
	});

	test('can log a threw_up activity', async ({ asMember }) => {
		await asMember.goto(`/${COMP}/log`);

		await asMember.getByRole('button', { name: /add/i }).click();

		await asMember.locator('select[name="type"]').selectOption('threw_up');
		await asMember.locator('textarea[name="notes"]').fill('After eating grass');

		await asMember.getByRole('button', { name: /save/i }).click();

		await expect(asMember.getByText('Threw up')).toBeVisible({ timeout: 5_000 });
		await expect(asMember.getByText('After eating grass')).toBeVisible({ timeout: 5_000 });
	});

	test('can log a walk activity from log page', async ({ asMember }) => {
		await asMember.goto(`/${COMP}/log`);

		await asMember.getByRole('button', { name: /add/i }).click();

		await asMember.locator('select[name="type"]').selectOption('walk');
		await asMember.locator('textarea[name="notes"]').fill('Morning walk test');

		await asMember.getByRole('button', { name: /save/i }).click();

		await expect(asMember.getByText('Walk')).toBeVisible({ timeout: 5_000 });
		await expect(asMember.getByText('Morning walk test')).toBeVisible({ timeout: 5_000 });
	});

	test('can delete a logged activity', async ({ asMember }) => {
		await asMember.goto(`/${COMP}/log`);

		await asMember.getByRole('button', { name: /add/i }).click();
		await asMember.locator('select[name="type"]').selectOption('treat');
		await asMember.getByRole('button', { name: /save/i }).click();

		await expect(asMember.getByText('Treat')).toBeVisible({ timeout: 5_000 });

		const deleteBtn = asMember.getByRole('button', { name: /delete|trash/i }).first();
		await deleteBtn.click();

		await expect(asMember.getByText('Treat')).toHaveCount(0, { timeout: 5_000 });
	});
});
