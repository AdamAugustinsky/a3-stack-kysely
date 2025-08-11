import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { redirect } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
	if (event.route.id?.startsWith('/(protected)/')) {
		const [session, organizations] = [
			await auth.api.getSession({
				headers: event.request.headers
			}),
			await auth.api.listOrganizations({
				headers: event.request.headers
			})
		];

		if (session) {
			event.locals.session = session.session;
			event.locals.user = session.user;
			event.locals.organizations = organizations;

			return await svelteKitHandler({
				event,
				resolve,
				auth,
				building
			});
		} else {
			redirect(307, '/sign-in');
		}
	}
	return await svelteKitHandler({
		event,
		resolve,
		auth,
		building
	});
}
