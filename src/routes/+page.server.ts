import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ request }) => {
    // Check if user has a valid session
    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (session) {
        // User is authenticated, check if they have organizations
        const organizations = await auth.api.listOrganizations({
            headers: request.headers
        });

        if (organizations && organizations.length > 0) {
            // User has organizations, redirect to the first organization's dashboard
            redirect(302, `/${organizations[0].slug}/dashboard`);
        } else {
            // User has no organizations, redirect to create organization
            redirect(302, '/create-organization');
        }
    } else {
        // User is not authenticated, redirect to sign-in
        redirect(302, '/sign-in');
    }
};
