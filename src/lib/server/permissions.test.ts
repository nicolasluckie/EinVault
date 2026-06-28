import { describe, it, expect, beforeAll } from 'vitest';
import { db, schema } from '$lib/server/db';
import { assertCanEditCompanion } from './permissions';

type Locals = Parameters<typeof assertCanEditCompanion>[0];

function locals(user: { id: string; role: 'admin' } | null): Locals {
	return { user, session: null, locale: 'en' } as unknown as Locals;
}

async function statusOf(p: Promise<void>): Promise<number | 'ok'> {
	try {
		await p;
		return 'ok';
	} catch (e) {
		return (e as { status: number }).status;
	}
}

describe('assertCanEditCompanion', () => {
	beforeAll(async () => {
		await db.insert(schema.users).values([
			{ id: 'adm', username: 'adm', displayName: 'A', role: 'admin' }
		] as (typeof schema.users.$inferInsert)[]);
	});

	it('401 for anonymous', async () => {
		expect(await statusOf(assertCanEditCompanion(locals(null), 'comp1'))).toBe(401);
	});

	it('allows admin', async () => {
		expect(
			await statusOf(assertCanEditCompanion(locals({ id: 'adm', role: 'admin' }), 'comp1'))
		).toBe('ok');
	});
});
