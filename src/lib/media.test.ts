import { describe, it, expect } from 'vitest';
import { MEDIA_ACCEPT, isVideoMime } from './media';

describe('media', () => {
	describe('MEDIA_ACCEPT', () => {
		it('includes common image formats', () => {
			expect(MEDIA_ACCEPT).toContain('image/jpeg');
			expect(MEDIA_ACCEPT).toContain('image/png');
			expect(MEDIA_ACCEPT).toContain('image/webp');
			expect(MEDIA_ACCEPT).toContain('image/gif');
		});

		it('includes common video formats', () => {
			expect(MEDIA_ACCEPT).toContain('video/mp4');
			expect(MEDIA_ACCEPT).toContain('video/webm');
			expect(MEDIA_ACCEPT).toContain('video/quicktime');
		});
	});

	describe('isVideoMime', () => {
		it('returns true for video mime types', () => {
			expect(isVideoMime('video/mp4')).toBe(true);
			expect(isVideoMime('video/webm')).toBe(true);
			expect(isVideoMime('video/quicktime')).toBe(true);
		});

		it('returns false for image mime types', () => {
			expect(isVideoMime('image/jpeg')).toBe(false);
			expect(isVideoMime('image/png')).toBe(false);
		});

		it('returns false for null', () => {
			expect(isVideoMime(null)).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(isVideoMime(undefined)).toBe(false);
		});

		it('returns false for empty string', () => {
			expect(isVideoMime('')).toBe(false);
		});
	});
});
