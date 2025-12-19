import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { redirect } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	const isProtectedRoute = event.route.id?.startsWith('/(protected)/');
	const isAuthRoute = event.route.id === '/sign-in' || event.route.id === '/sign-up';

	if (session) {
		const organizations = await auth.api.listOrganizations({
			headers: event.request.headers
		});

		event.locals.session = session.session;
		event.locals.user = session.user;
		event.locals.organizations = organizations;

		// Redirect authenticated users away from auth pages
		if (isAuthRoute) {
			if (Array.isArray(organizations) && organizations.length > 0) {
				redirect(307, `/${organizations[0].slug}/dashboard`);
			} else {
				redirect(307, '/create-organization');
			}
		}
	} else if (isProtectedRoute) {
		redirect(307, '/sign-in');
	}

	return await svelteKitHandler({
		event,
		resolve,
		auth,
		building
	});
}
