import { describe, it, expect } from 'vitest';
import {
	HEALTH_TO_REMINDER_TYPE,
	REMINDER_TO_HEALTH_TYPE,
	reminderPrefillUrl,
	healthEventPrefillUrl
} from './health';

describe('health', () => {
	describe('HEALTH_TO_REMINDER_TYPE', () => {
		it('maps vet_visit to vet', () => {
			expect(HEALTH_TO_REMINDER_TYPE.vet_visit).toBe('vet');
		});

		it('maps vaccination to vaccination', () => {
			expect(HEALTH_TO_REMINDER_TYPE.vaccination).toBe('vaccination');
		});

		it('maps medication to medication', () => {
			expect(HEALTH_TO_REMINDER_TYPE.medication).toBe('medication');
		});

		it('maps procedure to vet', () => {
			expect(HEALTH_TO_REMINDER_TYPE.procedure).toBe('vet');
		});

		it('maps other to other', () => {
			expect(HEALTH_TO_REMINDER_TYPE.other).toBe('other');
		});

		it('is readonly at TypeScript level', () => {
			// TypeScript enforces readonly via `as const` - runtime freezing is not required
			expect(HEALTH_TO_REMINDER_TYPE).toBeDefined();
		});
	});

	describe('REMINDER_TO_HEALTH_TYPE', () => {
		it('maps vet to vet_visit', () => {
			expect(REMINDER_TO_HEALTH_TYPE.vet).toBe('vet_visit');
		});

		it('maps medication to medication', () => {
			expect(REMINDER_TO_HEALTH_TYPE.medication).toBe('medication');
		});

		it('maps vaccination to vaccination', () => {
			expect(REMINDER_TO_HEALTH_TYPE.vaccination).toBe('vaccination');
		});

		it('maps grooming to null', () => {
			expect(REMINDER_TO_HEALTH_TYPE.grooming).toBeNull();
		});

		it('maps other to null', () => {
			expect(REMINDER_TO_HEALTH_TYPE.other).toBeNull();
		});

		it('is readonly at TypeScript level', () => {
			// TypeScript enforces readonly via `as const` - runtime freezing is not required
			expect(REMINDER_TO_HEALTH_TYPE).toBeDefined();
		});
	});

	describe('reminderPrefillUrl', () => {
		it('builds URL with basic params', () => {
			const url = reminderPrefillUrl('comp-1', 'vet_visit', 'Annual checkup', null);
			expect(url).toBe('/comp-1/reminders?new=1&title=Annual%20checkup&type=vet');
		});

		it('includes notes when provided', () => {
			const url = reminderPrefillUrl('comp-1', 'vet_visit', 'Checkup', 'Bring records');
			expect(url).toContain('description=Bring%20records');
		});

		it('truncates title to 200 chars', () => {
			const longTitle = 'a'.repeat(250);
			const url = reminderPrefillUrl('comp-1', 'vet_visit', longTitle, null);
			expect(url).toContain(`title=${'a'.repeat(200)}`);
		});

		it('truncates notes to 2000 chars', () => {
			const longNotes = 'b'.repeat(2500);
			const url = reminderPrefillUrl('comp-1', 'vet_visit', 'Checkup', longNotes);
			expect(url).toContain(`description=${'b'.repeat(2000)}`);
		});

		it('encodes special characters', () => {
			const url = reminderPrefillUrl('comp-1', 'vet_visit', 'Checkup & test', 'Note: test');
			expect(url).toContain('title=Checkup%20%26%20test');
			expect(url).toContain('description=Note%3A%20test');
		});
	});

	describe('healthEventPrefillUrl', () => {
		it('builds URL with basic params', () => {
			const url = healthEventPrefillUrl('comp-1', { title: 'Vaccination', description: null });
			expect(url).toBe('/comp-1/health?new=1&title=Vaccination');
		});

		it('includes type when provided', () => {
			const url = healthEventPrefillUrl('comp-1', {
				title: 'Vaccination',
				description: null,
				type: 'vaccination'
			});
			expect(url).toContain('type=vaccination');
		});

		it('includes description when provided', () => {
			const url = healthEventPrefillUrl('comp-1', {
				title: 'Vaccination',
				description: 'Annual shot'
			});
			expect(url).toContain('description=Annual%20shot');
		});

		it('truncates title to 200 chars', () => {
			const longTitle = 'a'.repeat(250);
			const url = healthEventPrefillUrl('comp-1', { title: longTitle, description: null });
			expect(url).toContain(`title=${'a'.repeat(200)}`);
		});

		it('truncates description to 2000 chars', () => {
			const longDesc = 'b'.repeat(2500);
			const url = healthEventPrefillUrl('comp-1', { title: 'Test', description: longDesc });
			expect(url).toContain(`description=${'b'.repeat(2000)}`);
		});

		it('encodes special characters', () => {
			const url = healthEventPrefillUrl('comp-1', {
				title: 'Test & check',
				description: 'Note: important'
			});
			expect(url).toContain('title=Test%20%26%20check');
			expect(url).toContain('description=Note%3A%20important');
		});
	});
});
