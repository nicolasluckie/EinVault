import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { ADMIN_USERNAME, ADMIN_PASSWORD } from '$lib/server/env';
import bcrypt from 'bcryptjs';

/**
 * Bootstraps the admin user from environment variables.
 * Creates the user if absent, updates the password hash if changed.
 * Returns the stable user ID so sessions continue to work.
 */
export async function bootstrapAdminUser(): Promise<string> {
	if (!ADMIN_PASSWORD) {
		console.warn('[bootstrap] ADMIN_PASSWORD not set — admin user will not be provisioned');
		throw new Error('ADMIN_PASSWORD environment variable is required');
	}

	const existing = await db.query.users.findFirst({
		where: eq(schema.users.username, ADMIN_USERNAME)
	});

	if (existing) {
		// Check if password changed by comparing against stored hash
		const passwordChanged =
			!existing.passwordHash || !(await bcrypt.compare(ADMIN_PASSWORD, existing.passwordHash));

		if (passwordChanged) {
			const newHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
			await db
				.update(schema.users)
				.set({ passwordHash: newHash })
				.where(eq(schema.users.id, existing.id));
			console.info(`[bootstrap] updated password for admin user '${ADMIN_USERNAME}'`);
		} else {
			console.info(`[bootstrap] admin user '${ADMIN_USERNAME}' already exists`);
		}
		return existing.id;
	}

	// Create new admin user
	const userId = crypto.randomUUID();
	const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
	await db.insert(schema.users).values({
		id: userId,
		username: ADMIN_USERNAME,
		displayName: ADMIN_USERNAME.charAt(0).toUpperCase() + ADMIN_USERNAME.slice(1),
		passwordHash,
		role: 'admin',
		isActive: true
	});

	console.info(`[bootstrap] created admin user '${ADMIN_USERNAME}'`);
	return userId;
}
