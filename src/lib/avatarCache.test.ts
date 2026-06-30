import { describe, it, expect, beforeEach } from 'vitest';
import {
	avatarCacheBusts,
	bustAvatarCache,
	userAvatarCacheBusts,
	bustUserAvatarCache
} from './avatarCache.svelte';

describe('avatarCache', () => {
	beforeEach(() => {
		// Clear the state before each test
		for (const key of Object.keys(avatarCacheBusts)) {
			delete avatarCacheBusts[key];
		}
		for (const key of Object.keys(userAvatarCacheBusts)) {
			delete userAvatarCacheBusts[key];
		}
	});

	describe('bustAvatarCache', () => {
		it('sets a timestamp for the companion', () => {
			bustAvatarCache('comp-1');
			expect(avatarCacheBusts['comp-1']).toBeTypeOf('number');
			expect(avatarCacheBusts['comp-1']).toBeGreaterThan(0);
		});

		it('handles multiple companions', () => {
			bustAvatarCache('comp-1');
			bustAvatarCache('comp-2');
			bustAvatarCache('comp-3');

			expect(avatarCacheBusts['comp-1']).toBeTypeOf('number');
			expect(avatarCacheBusts['comp-2']).toBeTypeOf('number');
			expect(avatarCacheBusts['comp-3']).toBeTypeOf('number');
		});
	});

	describe('bustUserAvatarCache', () => {
		it('sets a timestamp for the user', () => {
			bustUserAvatarCache('user-1');
			expect(userAvatarCacheBusts['user-1']).toBeTypeOf('number');
			expect(userAvatarCacheBusts['user-1']).toBeGreaterThan(0);
		});

		it('handles multiple users', () => {
			bustUserAvatarCache('user-1');
			bustUserAvatarCache('user-2');

			expect(userAvatarCacheBusts['user-1']).toBeTypeOf('number');
			expect(userAvatarCacheBusts['user-2']).toBeTypeOf('number');
		});
	});
});
