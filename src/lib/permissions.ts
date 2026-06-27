/**
 * Authorization helpers shared by client UI and server route handlers.
 * Keep logic here so the UI (button visibility) and API (403 check) cannot drift.
 */

type AuthUser = { id: string; role: 'admin' } | null | undefined;

/**
 * Users can modify (edit caption, delete) any journal media item they uploaded.
 * Items with a null `loggedBy` (pre-migration legacy rows) are modifiable by any user.
 */
export function canModifyMedia(user: AuthUser, item: { loggedBy: string | null }): boolean {
	if (!user) return false;
	return item.loggedBy === null || item.loggedBy === user.id;
}
