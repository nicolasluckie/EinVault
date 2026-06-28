import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { t } from '$lib/i18n';
import { db, schema } from '$lib/server/db';
import { eq, and, ne } from 'drizzle-orm';
import { generateId } from '$lib/server/utils';
import bcrypt from 'bcryptjs';
import { invalidateAllUserSessions } from '$lib/server/auth/session';
import { parseRole, EMAIL_RE } from '$lib/server/validation';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/auth/login');
	if (locals.user.role !== 'admin') error(403, t(locals.locale, 'error.forbidden'));

	const users = await db.query.users.findMany({
		orderBy: (u, { asc }) => [asc(u.createdAt)],
		columns: {
			passwordHash: false
		}
	});

	return {
		users,
		currentUserId: locals.user.id
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') error(403, t(locals.locale, 'error.forbidden'));

		const data = await request.formData();
		const displayName = String(data.get('displayName') ?? '').trim();
		const username = String(data.get('username') ?? '')
			.trim()
			.toLowerCase();
		const password = String(data.get('password') ?? '');
		const role = parseRole(String(data.get('role') ?? 'member')) ?? 'member';

		if (!displayName || !username || !password) {
			return fail(400, { createError: t(locals.locale, 'error.allFieldsRequired') });
		}
		if (!/^[a-z0-9_-]+$/.test(username)) {
			return fail(400, { createError: t(locals.locale, 'error.invalidUsernameFormat') });
		}
		if (password.length < 8) {
			return fail(400, { createError: t(locals.locale, 'error.passwordTooShort') });
		}
		if (password.length > 128) {
			return fail(400, { createError: t(locals.locale, 'error.passwordTooLong') });
		}

		const existing = await db.query.users.findFirst({
			where: eq(schema.users.username, username)
		});
		if (existing) {
			return fail(400, { createError: t(locals.locale, 'error.usernameAlreadyTaken') });
		}

		const passwordHash = await bcrypt.hash(password, 12);
		await db.insert(schema.users).values({
			id: generateId(15),
			username,
			displayName,
			passwordHash,
			role
		});

		return { createSuccess: true };
	},

	toggleActive: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') error(403, t(locals.locale, 'error.forbidden'));

		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');

		if (userId === locals.user.id) {
			return fail(400, { toggleError: t(locals.locale, 'error.cannotDeactivateOwnAccount') });
		}

		const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
		if (!user) return fail(404, { toggleError: t(locals.locale, 'error.userNotFound') });

		const newIsActive = !user.isActive;
		await db.update(schema.users).set({ isActive: newIsActive }).where(eq(schema.users.id, userId));

		if (!newIsActive) {
			await invalidateAllUserSessions(userId);
		}

		return { toggleSuccess: true };
	},

	resetPassword: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') error(403, t(locals.locale, 'error.forbidden'));

		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const newPassword = String(data.get('newPassword') ?? '');

		if (!userId) return fail(400, { resetError: t(locals.locale, 'error.missingUserId') });
		if (newPassword.length < 8) {
			return fail(400, { resetError: t(locals.locale, 'error.passwordTooShort') });
		}
		if (newPassword.length > 128) {
			return fail(400, { resetError: t(locals.locale, 'error.passwordTooLong') });
		}

		const target = await db.query.users.findFirst({ where: eq(schema.users.id, userId) });
		if (!target) return fail(404, { resetError: t(locals.locale, 'error.userNotFound') });

		const passwordHash = await bcrypt.hash(newPassword, 12);
		await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, userId));

		await invalidateAllUserSessions(userId);

		return { resetSuccess: true };
	},

	editUser: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') error(403, t(locals.locale, 'error.forbidden'));

		const data = await request.formData();
		const userId = String(data.get('userId') ?? '');
		const displayName = String(data.get('displayName') ?? '').trim();
		const username = String(data.get('username') ?? '')
			.trim()
			.toLowerCase();
		const email =
			String(data.get('email') ?? '')
				.trim()
				.toLowerCase() || null;
		const phone = String(data.get('phone') ?? '').trim() || null;
		const role = parseRole(String(data.get('role') ?? ''));

		if (!userId) return fail(400, { editError: t(locals.locale, 'error.missingUserId') });
		if (!displayName)
			return fail(400, { editError: t(locals.locale, 'error.displayNameRequired') });
		if (!username) return fail(400, { editError: t(locals.locale, 'error.usernameRequired') });
		if (!/^[a-z0-9_-]+$/.test(username))
			return fail(400, { editError: t(locals.locale, 'error.invalidUsernameFormat') });
		if (!role) return fail(400, { editError: t(locals.locale, 'error.invalidRole') });

		const conflict = await db.query.users.findFirst({
			where: and(eq(schema.users.username, username), ne(schema.users.id, userId))
		});
		if (conflict) return fail(400, { editError: t(locals.locale, 'error.usernameAlreadyTaken') });

		if (email) {
			if (!EMAIL_RE.test(email)) {
				return fail(400, { editError: t(locals.locale, 'error.emailInvalid') });
			}
			const emailConflict = await db.query.users.findFirst({
				where: and(eq(schema.users.email, email), ne(schema.users.id, userId))
			});
			if (emailConflict) {
				return fail(400, { editError: t(locals.locale, 'error.emailAlreadyTaken') });
			}
		}

		try {
			await db
				.update(schema.users)
				.set({ displayName, username, email, phone, role })
				.where(eq(schema.users.id, userId));
		} catch (err) {
			if (
				err instanceof Error &&
				(err as Error & { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE' &&
				err.message.includes('users.email')
			) {
				return fail(400, { editError: t(locals.locale, 'error.emailAlreadyTaken') });
			}
			throw err;
		}

		return { editSuccess: true };
	}
};
