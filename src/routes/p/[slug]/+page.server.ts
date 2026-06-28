import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db, schema } from '$lib/server/db';
import { eq, and, isNull } from 'drizzle-orm';
import { localDateISO } from '$lib/date';

export const load: PageServerLoad = async ({ params }) => {
	const companion = await db.query.companions.findFirst({
		where: eq(schema.companions.publicSlug, params.slug)
	});

	if (!companion || !companion.publicEnabled) {
		error(404);
	}

	const now = new Date();

	const [recentHealth, recentDaily, upcomingReminders, recentWeights, todayJournal] =
		await Promise.all([
			db.query.healthEvents.findMany({
				where: eq(schema.healthEvents.companionId, companion.id),
				orderBy: (h, { desc }) => [desc(h.occurredAt)],
				limit: 5,
				with: { logger: { columns: { displayName: true } } }
			}),
			db.query.dailyEvents.findMany({
				where: eq(schema.dailyEvents.companionId, companion.id),
				orderBy: (d, { desc }) => [desc(d.loggedAt)],
				limit: 10,
				with: { logger: { columns: { displayName: true } } }
			}),
			db.query.reminders.findMany({
				where: and(
					eq(schema.reminders.companionId, companion.id),
					isNull(schema.reminders.completedAt)
				),
				orderBy: (r, { asc }) => [asc(r.dueAt)],
				limit: 5,
				with: { logger: { columns: { displayName: true } } }
			}),
			db.query.weightEntries.findMany({
				where: eq(schema.weightEntries.companionId, companion.id),
				orderBy: (w, { desc }) => [desc(w.recordedAt)],
				limit: 10,
				with: { logger: { columns: { displayName: true } } }
			}),
			db.query.journalEntries.findFirst({
				where: and(
					eq(schema.journalEntries.companionId, companion.id),
					eq(schema.journalEntries.date, localDateISO(now))
				),
				with: { logger: { columns: { displayName: true } } }
			})
		]);

	return {
		companion,
		recentHealth,
		recentDaily,
		upcomingReminders,
		recentWeights,
		todayJournal
	};
};
