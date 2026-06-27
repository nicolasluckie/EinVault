import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { ADMIN_USERNAME, ADMIN_PASSWORD_HASH } from '$lib/server/env';
import bcrypt from 'bcryptjs';

/**
 * Bootstraps the admin user from environment variables.
 * Creates the user if absent, updates the password hash if changed.
 * Returns the stable user ID so sessions continue to work.
 */
export async function bootstrapAdminUser(): Promise<string> {
	if (!ADMIN_PASSWORD_HASH) {
		console.warn('[bootstrap] ADMIN_PASSWORD_HASH not set — admin user will not be provisioned');
		throw new Error('ADMIN_PASSWORD_HASH environment variable is required');
	}

	const existing = await db.query.users.findFirst({
		where: eq(schema.users.username, ADMIN_USERNAME)
	});

	if (existing) {
		// Update password hash if it changed (allows rotating credentials)
		if (existing.passwordHash !== ADMIN_PASSWORD_HASH) {
			await db
				.update(schema.users)
				.set({ passwordHash: ADMIN_PASSWORD_HASH })
				.where(eq(schema.users.id, existing.id));
			console.info(`[bootstrap] updated password hash for admin user '${ADMIN_USERNAME}'`);
		} else {
			console.info(`[bootstrap] admin user '${ADMIN_USERNAME}' already exists`);
		}
		return existing.id;
	}

	// Create new admin user
	const userId = crypto.randomUUID();
	await db.insert(schema.users).values({
		id: userId,
		username: ADMIN_USERNAME,
		displayName: ADMIN_USERNAME.charAt(0).toUpperCase() + ADMIN_USERNAME.slice(1),
		passwordHash: ADMIN_PASSWORD_HASH,
		role: 'admin',
		isActive: true
	});

	console.info(`[bootstrap] created admin user '${ADMIN_USERNAME}'`);
	return userId;
}
