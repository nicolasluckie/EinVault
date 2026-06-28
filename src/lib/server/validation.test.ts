import { describe, it, expect } from 'vitest';
import { parseDailyEventType } from './validation';

describe('parseDailyEventType', () => {
	it('accepts all valid activity types', () => {
		const valid = ['walk', 'meal', 'bathroom', 'treat', 'play', 'grooming', 'threw_up', 'other'];
		for (const type of valid) {
			expect(parseDailyEventType(type)).toBe(type);
		}
	});

	it('accepts threw_up', () => {
		expect(parseDailyEventType('threw_up')).toBe('threw_up');
	});

	it('rejects unknown types', () => {
		expect(parseDailyEventType('vomit')).toBeNull();
		expect(parseDailyEventType('puke')).toBeNull();
		expect(parseDailyEventType('')).toBeNull();
		expect(parseDailyEventType('THREW_UP')).toBeNull();
	});
});
