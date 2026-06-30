import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		host: '127.0.0.1',
		port: 5173
	},
	test: {
		include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
		environment: 'node',
		setupFiles: ['./src/vitest.setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.{js,ts}'],
			exclude: [
				'src/**/*.test.ts',
				'src/**/*.spec.ts',
				'src/vitest.setup.ts',
				'src/routes/**',
				'src/app.d.ts',
				'src/lib/server/storage/**',
				'src/lib/server/mail/**',
				'src/lib/server/notify/**',
				'src/lib/server/video/**',
				'src/lib/server/auth/bootstrap.ts',
				'src/lib/server/auth/password-reset.ts',
				'src/lib/server/auth/rate-limit.ts',
				'src/lib/i18n/index.ts',
				'src/lib/i18n/labels.ts'
			],
			thresholds: {
				lines: 50,
				functions: 50,
				branches: 30,
				statements: 50
			}
		}
	}
});
