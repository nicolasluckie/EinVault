import { error, type RequestEvent } from '@sveltejs/kit';
import { t } from '$lib/i18n';

// Admin can always edit a companion. Throws via SvelteKit's error()
// helper on failure; returns void on success.
export async function assertCanEditCompanion(
	locals: RequestEvent['locals'],
	companionId: string
): Promise<void> {
	if (!locals.user) error(401, t(locals.locale, 'error.unauthorized'));
}
