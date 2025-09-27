import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { redirect } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
	console.log('Handling request');
	console.log(event.route.id);
	if (event.route.id?.startsWith('/(protected)/')) {

		console.log('Getting session and organizations');
		const session = await auth.api.getSession({
			headers: event.request.headers
		})

		console.log({
			session,
		});

		if (session) {
			const organizations = await auth.api.listOrganizations({
				headers: event.request.headers
			})
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
			console.log('No session found, redirecting to sign-in');
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
