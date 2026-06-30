// Notification scheduler (issue #12). A 60-second in-process interval that
// (a) produces outbox rows for newly-due reminders and for shifts entering
// the 24h lead window, then (b) drains the queue through SMTP. Single-flight
// like the video worker: overlapping ticks are no-ops. Single-process
// assumption: the in-memory flag and the select-then-claim pattern both
// presume one app process per database — the same accepted constraint as the
// video worker.
// Delivery is at-least-once: a crash between sendMail and markSent re-sends that one notification after boot recovery — accepted trade-off.
import { and, eq, gt, isNull, lte } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { t } from '$lib/i18n';
import { db, schema } from '$lib/server/db';
import { isMailEnabled, sendMail } from '$lib/server/mail';
import { buildReminderEmail, formatWhen } from '$lib/server/mail/templates';
import { isNtfyEnabled, sendNtfy } from './ntfy';
import {
	claimNext,
	cleanupOldRows,
	enqueue,
	markFailedOrRequeue,
	markSent,
	markSkipped,
	recoverOrphanedClaims,
	reminderDedupeKey,
	type ClaimedNotification,
	type EnqueueRow
} from './outbox';

// Overridable for tests (NOTIFY_SCAN_INTERVAL_MS=1000); floor prevents a
// misconfigured prod value from busy-looping the scheduler.
const SCAN_INTERVAL_MS = (() => {
	const raw = Number(env.NOTIFY_SCAN_INTERVAL_MS);
	return Number.isFinite(raw) && raw >= 250 ? raw : 60 * 1000;
})();
// First-deploy guard: reminders overdue longer than this never produce a
// notification. Without it, enabling the feature on an existing install would
// email every historically overdue reminder at once.
const CATCH_UP_MS = 24 * 60 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;
let scanning = false;

interface Recipient {
	id: string;
	role: 'admin' | 'member' | 'caretaker';
	email: string | null;
	ntfyTopic: string | null;
	flag: boolean;
}

/**
 * Users relevant to a notification category: active, with the category's
 * email flag and their ntfy topic. Channel filtering happens at the call
 * site: email rows need flag && email, ntfy rows need a topic.
 */
async function categoryRecipients(
	flagColumn: typeof schema.users.notifyReminderEmail
): Promise<Recipient[]> {
	return db
		.select({
			id: schema.users.id,
			role: schema.users.role,
			email: schema.users.email,
			ntfyTopic: schema.users.ntfyTopic,
			flag: flagColumn
		})
		.from(schema.users)
		.where(eq(schema.users.isActive, true));
}

/** Due reminders → one outbox row per eligible recipient. */
async function produceReminders(now: Date): Promise<EnqueueRow[]> {
	const due = await db
		.select({
			id: schema.reminders.id,
			dueAt: schema.reminders.dueAt,
			companionId: schema.reminders.companionId
		})
		.from(schema.reminders)
		.innerJoin(schema.companions, eq(schema.reminders.companionId, schema.companions.id))
		.where(
			and(
				isNull(schema.reminders.completedAt),
				lte(schema.reminders.dueAt, now),
				gt(schema.reminders.dueAt, new Date(now.getTime() - CATCH_UP_MS)),
				eq(schema.companions.isActive, true)
			)
		);
	if (due.length === 0) return [];

	const recipients = await categoryRecipients(schema.users.notifyReminderEmail);

	const mailOn = isMailEnabled();
	const ntfyOn = isNtfyEnabled();
	const rows: EnqueueRow[] = [];
	for (const reminder of due) {
		for (const user of recipients) {
			const payload = {
				kind: 'reminderDue' as const,
				reminderId: reminder.id,
				dueAtEpoch: Math.floor(reminder.dueAt.getTime() / 1000)
			};
			if (mailOn && user.flag && user.email) {
				rows.push({
					dedupeKey: reminderDedupeKey(reminder.id, reminder.dueAt, user.id, 'email'),
					userId: user.id,
					channel: 'email',
					payload
				});
			}
			if (ntfyOn && user.ntfyTopic) {
				rows.push({
					dedupeKey: reminderDedupeKey(reminder.id, reminder.dueAt, user.id, 'ntfy'),
					userId: user.id,
					channel: 'ntfy',
					payload
				});
			}
		}
	}
	return rows;
}

async function produce(): Promise<void> {
	const now = new Date();
	const rows = await produceReminders(now);
	const fresh = await enqueue(rows);
	if (fresh > 0) console.info(`[notify] enqueued ${fresh} notification(s)`);
}

/** Resolve the recipient, or null if no longer eligible at delivery time. */
async function eligibleRecipient(userId: string) {
	const user = await db.query.users.findFirst({
		where: eq(schema.users.id, userId),
		columns: { passwordHash: false }
	});
	if (!user || !user.isActive) return null;
	return user;
}

// Deep links need a configured public origin; without one the email simply
// has no button (boot already warns about ORIGIN when SMTP is on).
function publicLink(path: string): string | null {
	const origin = env.ORIGIN?.trim().replace(/\/$/, '') || null;
	return origin ? `${origin}${path}` : null;
}

async function deliverReminder(
	row: ClaimedNotification,
	payload: { reminderId: string; dueAtEpoch: number }
): Promise<void> {
	const reminder = await db.query.reminders.findFirst({
		where: eq(schema.reminders.id, payload.reminderId)
	});
	// Reminder deleted or completed since enqueue: nothing to say anymore.
	if (!reminder || reminder.completedAt) {
		await markSkipped(row.id);
		return;
	}
	// The row was created for a specific occurrence time. If the reminder was
	// rescheduled since, this row is moot — the producer creates a fresh row
	// (new dedupe key) when the new time comes due.
	if (Math.floor(reminder.dueAt.getTime() / 1000) !== payload.dueAtEpoch) {
		await markSkipped(row.id);
		return;
	}
	const user = await eligibleRecipient(row.userId);
	if (!user || !user.email || !user.notifyReminderEmail) {
		await markSkipped(row.id);
		return;
	}
	const companion = await db.query.companions.findFirst({
		where: eq(schema.companions.id, reminder.companionId)
	});
	if (!companion || !companion.isActive) {
		await markSkipped(row.id);
		return;
	}

	const link = publicLink(`/${companion.id}/reminders`);
	const message = buildReminderEmail(
		user.locale,
		{ displayName: user.displayName, email: user.email },
		{ title: reminder.title, description: reminder.description, dueAt: reminder.dueAt },
		companion.name,
		link
	);
	await sendMail(message);
	await markSent(row.id);
}

async function deliverReminderNtfy(
	row: ClaimedNotification,
	payload: { reminderId: string; dueAtEpoch: number }
): Promise<void> {
	const reminder = await db.query.reminders.findFirst({
		where: eq(schema.reminders.id, payload.reminderId)
	});
	if (!reminder || reminder.completedAt) {
		await markSkipped(row.id);
		return;
	}
	if (Math.floor(reminder.dueAt.getTime() / 1000) !== payload.dueAtEpoch) {
		await markSkipped(row.id);
		return;
	}
	const user = await eligibleRecipient(row.userId);
	if (!user || !user.ntfyTopic) {
		await markSkipped(row.id);
		return;
	}
	const companion = await db.query.companions.findFirst({
		where: eq(schema.companions.id, reminder.companionId)
	});
	if (!companion || !companion.isActive) {
		await markSkipped(row.id);
		return;
	}

	await sendNtfy(user.ntfyTopic, {
		title: t(user.locale, 'email.reminder.subject', { title: reminder.title }),
		message: `${t(user.locale, 'email.reminder.body', { companion: companion.name, title: reminder.title })}\n${t(user.locale, 'email.reminder.dueLine', { due: formatWhen(user.locale, reminder.dueAt) })}`,
		click: publicLink(`/${companion.id}/reminders`)
	});
	await markSent(row.id);
}

/** Drain the queue until empty. Per-row errors requeue/fail that row only. */
async function drain(): Promise<void> {
	// One attempt per row per pass: rows requeued after a failure are excluded
	// until the next scan, so the 60s tick acts as retry backoff instead of
	// burning every attempt back-to-back against a struggling SMTP server.
	const failedThisPass = new Set<string>();
	for (;;) {
		const row = await claimNext(failedThisPass);
		if (!row) return;
		try {
			if (row.channel === 'email') {
				if (row.payload.kind === 'reminderDue') {
					await deliverReminder(row, row.payload);
				} else {
					console.error(
						`[notify] unknown payload kind '${row.payload.kind}'; skipping row ${row.id}`
					);
					await markSkipped(row.id);
				}
			} else if (row.channel === 'ntfy') {
				if (row.payload.kind === 'reminderDue') {
					await deliverReminderNtfy(row, row.payload);
				} else {
					console.error(
						`[notify] unknown payload kind '${row.payload.kind}'; skipping row ${row.id}`
					);
					await markSkipped(row.id);
				}
			} else {
				// apprise lands in a later PR.
				console.error(`[notify] no deliverer for channel '${row.channel}'; skipping row ${row.id}`);
				await markSkipped(row.id);
			}
		} catch (err) {
			console.error(`[notify] delivery failed (attempt ${row.attempts}):`, err);
			failedThisPass.add(row.id);
			await markFailedOrRequeue(row);
		}
	}
}

async function scan(): Promise<void> {
	if (scanning) return;
	scanning = true;
	try {
		await produce();
		await drain();
		await cleanupOldRows();
	} catch (err) {
		console.error('[notify] scan failed:', err);
	} finally {
		scanning = false;
	}
}

/**
 * Boot entry point. No-op unless SMTP or ntfy is configured. Recovers rows
 * orphaned by a crash, runs one immediate scan, then ticks every minute. The
 * timer is unref'd so it never keeps the process alive.
 */
export function startNotifyScheduler(): void {
	if (!isMailEnabled() && !isNtfyEnabled()) return;
	if (timer) return;
	recoverOrphanedClaims()
		.then((n) => {
			if (n > 0) console.info(`[notify] recovered ${n} interrupted notification(s)`);
			return scan();
		})
		.catch((err) => console.error('[notify] scheduler start failed:', err));
	timer = setInterval(() => void scan(), SCAN_INTERVAL_MS);
	timer.unref();
	console.info(
		`[notify] notification scheduler started (${SCAN_INTERVAL_MS}ms interval, channels: ${[
			...(isMailEnabled() ? ['email'] : []),
			...(isNtfyEnabled() ? ['ntfy'] : [])
		].join('+')})`
	);
}
