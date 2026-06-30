import { describe, it, expect } from 'vitest';
import { localDateISO } from './date';

describe('localDateISO', () => {
	it('returns today in YYYY-MM-DD format', () => {
		const result = localDateISO();
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('formats a specific date correctly', () => {
		const date = new Date('2024-03-15T12:00:00');
		const result = localDateISO(date);
		expect(result).toBe('2024-03-15');
	});

	it('handles single-digit months and days with padding', () => {
		const date = new Date('2024-01-05T12:00:00');
		const result = localDateISO(date);
		expect(result).toBe('2024-01-05');
	});

	it('handles December correctly', () => {
		const date = new Date('2024-12-31T12:00:00');
		const result = localDateISO(date);
		expect(result).toBe('2024-12-31');
	});
});
