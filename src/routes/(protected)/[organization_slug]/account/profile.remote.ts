import { command } from '$app/server';
import { auth } from '$lib/server/auth';
import { error } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';
import * as v from 'valibot';

// Validation schema for profile update (only name is supported)
const updateProfileSchema = v.object({
	name: v.pipe(v.string(), v.minLength(2), v.maxLength(100))
});

export const updateProfile = command(updateProfileSchema, async ({ name }) => {
	try {
		const event = getRequestEvent();
		if (!event) {
			error(500, 'Request context not available');
		}

		// Get current user session
		const session = await auth.api.getSession({
			headers: event.request.headers
		});

		if (!session) {
			error(401, 'Unauthorized');
		}

		// Update user profile (Better Auth only supports name updates via updateUser)
		const response = await auth.api.updateUser({
			body: {
				name
			},
			headers: event.request.headers
		});

		if (!response) {
			error(500, 'Failed to update profile');
		}

		return {
			success: true,
			user: response
		};
	} catch (err) {
		console.error('Profile update error:', err);
		if (err instanceof Error) {
			error(500, err.message);
		}
		error(500, 'Failed to update profile');
	}
});

// Note: Password change and account deletion are not implemented yet
// These would require additional Better Auth plugins or custom implementation
