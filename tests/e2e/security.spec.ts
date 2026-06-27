import { test, expect } from '../lib/fixtures';
import { SEED } from '../lib/seed';
import { pngUpload } from '../lib/files';

const EIN = SEED.companions.ein.id;
const EDWARD = SEED.companions.edward.id;

test.describe('security headers', () => {
	test('page response carries required security headers', async ({ app, browser }) => {
		const ctx = await browser.newContext({ baseURL: app.server.baseURL });
		const res = await ctx.request.get('/auth/login');
		expect(res.status()).toBe(200);

		const headers = res.headers();
		expect(headers['x-frame-options']).toBe('DENY');
		expect(headers['x-content-type-options']).toBe('nosniff');
		expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
		expect(headers['permissions-policy']).toContain('camera=()');
		expect(headers['content-security-policy'] ?? '').toBeTruthy();
		// Test server runs NODE_ENV=production so HSTS must be present
		expect(headers['strict-transport-security'] ?? '').toContain('max-age=');

		await ctx.close();
	});
});

test.describe('api authz', () => {
	test('health endpoint is public', async ({ app, browser }) => {
		const ctx = await browser.newContext({ baseURL: app.server.baseURL });
		const res = await ctx.request.get('/api/health');
		expect(res.status()).toBe(200);
		await ctx.close();
	});

	test('anonymous request to avatar endpoint returns 401', async ({ app, browser }) => {
		const ctx = await browser.newContext({ baseURL: app.server.baseURL });
		const res = await ctx.request.get(`/api/avatars/${EIN}`);
		// Handler: if (!locals.user) error(401, ...)
		expect(res.status()).toBe(401);
		await ctx.close();
	});
});
