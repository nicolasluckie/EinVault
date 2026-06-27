import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Admin user is now bootstrapped from environment variables
	// Setup page is no longer needed
	redirect(302, '/auth/login');
};
