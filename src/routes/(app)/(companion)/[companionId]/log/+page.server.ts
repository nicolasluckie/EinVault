import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { t } from '$lib/i18n';
import { db, schema } from '$lib/server/db';
import { eq, and, desc } from 'drizzle-orm';
import { localDateISO } from '$lib/date';

export const load: PageServerLoad = async ({ params, locals, parent }) => {
	if (!locals.user) redirect(302, '/auth/login');
	const { companion } = await parent();

	const today = localDateISO(new Date());

	const events = await db.query.dailyEvents.findMany({
		where: eq(schema.dailyEvents.companionId, params.companionId),
		orderBy: (d, { desc }) => [desc(d.loggedAt)],
		with: { logger: { columns: { displayName: true } } }
	});

	return {
		companion,
		events,
		today
	};
};

export const actions: Actions = {
	add: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: t(locals.locale, 'error.unauthorized') });

		const data = await request.formData();
		const event = String(data.get('event') ?? '').trim();
		const loggedAt = String(data.get('loggedAt') ?? localDateISO(new Date()));

		if (!event) return fail(400, { error: t(locals.locale, 'error.eventRequired') });

		await db.insert(schema.dailyEvents).values({
			id: crypto.randomUUID(),
			companionId: params.companionId,
			event,
			loggedAt: new Date(loggedAt),
			loggedBy: locals.user.id
		});

		return { addSuccess: true };
	},

	delete: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: t(locals.locale, 'error.unauthorized') });

		const data = await request.formData();
		const id = String(data.get('id') ?? '');

		if (!id) return fail(400, { error: t(locals.locale, 'error.missingId') });

		const existing = await db.query.dailyEvents.findFirst({
			where: and(eq(schema.dailyEvents.id, id), eq(schema.dailyEvents.companionId, params.companionId))
		});
		if (!existing) return fail(404, { error: t(locals.locale, 'error.eventNotFound') });

		await db.delete(schema.dailyEvents).where(eq(schema.dailyEvents.id, id));

		return { deleteSuccess: true };
	}
};
