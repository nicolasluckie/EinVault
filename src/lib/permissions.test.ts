import { describe, it, expect } from 'vitest';
import { canModifyMedia } from './permissions';

const admin = { id: 'a1', role: 'admin' } as const;

describe('canModifyMedia', () => {
	it('rejects missing user', () => {
		expect(canModifyMedia(null, { loggedBy: 'm1' })).toBe(false);
		expect(canModifyMedia(undefined, { loggedBy: 'm1' })).toBe(false);
	});

	it('admin can modify any media item, including legacy null-loggedBy rows', () => {
		expect(canModifyMedia(admin, { loggedBy: 'someone-else' })).toBe(true);
		expect(canModifyMedia(admin, { loggedBy: null })).toBe(true);
		expect(canModifyMedia(admin, { loggedBy: 'a1' })).toBe(true);
	});
});
