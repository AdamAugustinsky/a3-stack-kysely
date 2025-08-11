import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// User and session are already available from the parent layout
	const { user, session } = locals;

	return {
		user,
		session
	};
};
