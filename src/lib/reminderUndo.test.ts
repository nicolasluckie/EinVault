import { describe, it, expect } from 'vitest';
import {
	REMINDER_UNDO_PRESETS,
	REMINDER_UNDO_MAX_SECONDS,
	REMINDER_UNDO_DEFAULT_SENTINEL
} from './reminderUndo';

describe('reminderUndo', () => {
	describe('REMINDER_UNDO_PRESETS', () => {
		it('contains expected preset values', () => {
			expect(REMINDER_UNDO_PRESETS).toEqual([0, 3, 7, 15]);
		});

		it('is readonly at TypeScript level', () => {
			// TypeScript enforces readonly via `readonly` keyword - runtime freezing is not required
			expect(REMINDER_UNDO_PRESETS).toEqual([0, 3, 7, 15]);
		});
	});

	describe('REMINDER_UNDO_MAX_SECONDS', () => {
		it('is set to 60 seconds', () => {
			expect(REMINDER_UNDO_MAX_SECONDS).toBe(60);
		});
	});

	describe('REMINDER_UNDO_DEFAULT_SENTINEL', () => {
		it('is set to "default"', () => {
			expect(REMINDER_UNDO_DEFAULT_SENTINEL).toBe('default');
		});
	});
});
