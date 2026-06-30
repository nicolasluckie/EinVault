import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { t } from '$lib/i18n';
import { db, schema } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { getStorage, type GetResult } from '$lib/server/storage';

export const GET: RequestHandler = async ({ params, locals, request, url }) => {
	const companion = await db.query.companions.findFirst({
		where: eq(schema.companions.id, params.companionId)
	});
	if (!companion || !companion.publicEnabled || !companion.avatarPath) {
		error(404, t(locals.locale, 'error.noAvatar'));
	}

	const key = companion.avatarStorageKey ?? `avatars/${companion.avatarPath}`;
	const ifNoneMatch = request.headers.get('if-none-match');

	let res: GetResult | null;
	try {
		res = await getStorage(companion.avatarProvider).get(key, { ifNoneMatch });
	} catch (err) {
		if (err instanceof Error && err.message.includes('escapes upload root')) {
			error(403, t(locals.locale, 'error.forbidden'));
		}
		console.error(
			`[public/avatars] storage error provider=${companion.avatarProvider} key=${key}:`,
			err
		);
		error(502, t(locals.locale, 'error.fileNotFound'));
	}
	if (!res) error(404, t(locals.locale, 'error.fileNotFound'));

	if (res.kind === 'notModified') {
		return new Response(null, { status: 304, headers: { ETag: res.etag } });
	}

	if (res.kind === 'redirect') {
		return new Response(null, {
			status: 302,
			headers: {
				Location: res.url,
				'Cache-Control': `public, max-age=${res.cacheSeconds}`,
				'Referrer-Policy': 'no-referrer'
			}
		});
	}

	const ext = companion.avatarPath.split('.').pop() ?? 'jpg';
	const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

	const hasCacheBuster = url.searchParams.has('t');
	const cacheControl =
		companion.avatarProvider === 'immich'
			? 'public, max-age=300'
			: hasCacheBuster
				? 'public, max-age=31536000, immutable'
				: 'public, no-cache';

	return new Response(res.stream, {
		headers: {
			'Content-Type': mimeType,
			'Content-Length': String(res.stat.size),
			'Cache-Control': cacheControl,
			ETag: res.stat.etag,
			'Last-Modified': res.stat.mtime.toUTCString(),
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
