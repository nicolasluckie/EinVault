import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
	it('merges class names with clsx', () => {
		expect(cn('foo', 'bar')).toBe('foo bar');
	});

	it('handles conditional classes', () => {
		const condition1 = true;
		const condition2 = false;
		expect(cn('foo', condition1 && 'bar', condition2 && 'baz')).toBe('foo bar');
	});

	it('merges tailwind classes correctly', () => {
		expect(cn('px-2', 'px-4')).toBe('px-4');
	});

	it('handles empty input', () => {
		expect(cn()).toBe('');
	});

	it('handles arrays', () => {
		expect(cn(['foo', 'bar'])).toBe('foo bar');
	});

	it('handles objects', () => {
		expect(cn({ foo: true, bar: false })).toBe('foo');
	});
});
