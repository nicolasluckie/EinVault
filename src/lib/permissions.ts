/**
 * Authorization helpers shared by client UI and server route handlers.
 * Keep logic here so the UI (button visibility) and API (403 check) cannot drift.
 */

type AuthUser = { id: string; role: 'admin' } | null | undefined;

/**
 * Admins can modify any journal media item.
 * Non-admins can modify only items they uploaded; items with a null `loggedBy`
 * (pre-migration legacy rows) are restricted to admins.
 */
export function canModifyMedia(user: AuthUser, item: { loggedBy: string | null }): boolean {
	if (!user) return false;
	if (user.role === 'admin') return true;
	return item.loggedBy !== null && item.loggedBy === user.id;
}
