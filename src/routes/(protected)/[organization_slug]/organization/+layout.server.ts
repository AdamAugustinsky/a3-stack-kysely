import type { LayoutServerLoad } from './$types';
import { auth } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ locals, params, request }) => {
	// User and session are already available from the parent layout
	const { user, session } = locals;

	// Get the full organization with members and invitations
	const activeOrganization = await auth.api.getFullOrganization({
		headers: request.headers,
		query: { organizationSlug: params.organization_slug }
	});

	return {
		user,
		session,
		activeOrganization
	};
};
