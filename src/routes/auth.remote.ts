import { form, command, query, getRequestEvent } from '$app/server';
import { auth } from '@/server/auth';
import { error, redirect } from '@sveltejs/kit';
import * as v from 'valibot';

// ===========================
// Session & Organization Queries
// ===========================

// Get current session
export const getSession = query(async () => {
	const headers = getRequestEvent().request.headers;
	const result = await auth.api.getSession({ headers });
	return result;
});

// List organizations for current user
export const listOrganizations = query(async () => {
	const headers = getRequestEvent().request.headers;
	const result = await auth.api.listOrganizations({ headers });
	return Array.isArray(result) ? result : [];
});

// Get active organization
export const getActiveOrganization = query(async () => {
	const headers = getRequestEvent().request.headers;
	const result = await auth.api.getFullOrganization({ headers });
	return result ?? null;
});

// ===========================
// Organization Commands
// ===========================

// Set active organization
const setActiveOrganizationSchema = v.object({
	organizationId: v.optional(v.union([v.string(), v.null_()])),
	organizationSlug: v.optional(v.string())
});

export const setActiveOrganization = command(setActiveOrganizationSchema, async (args) => {
	const headers = getRequestEvent().request.headers;
	await auth.api.setActiveOrganization({
		headers,
		body: {
			organizationId: args.organizationId ?? undefined,
			organizationSlug: args.organizationSlug
		}
	});
	return { ok: true };
});

// Create organization form
const createOrganizationSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1, 'Organization name is required')),
	slug: v.pipe(v.string(), v.minLength(1, 'Organization slug is required'))
});

export const createOrganizationForm = form(createOrganizationSchema, async (data) => {
	const headers = getRequestEvent().request.headers;
	await auth.api.createOrganization({
		headers,
		body: {
			name: data.name,
			slug: data.slug
		}
	});

	// Set the new organization as active
	await auth.api.setActiveOrganization({
		headers,
		body: { organizationSlug: data.slug }
	});

	await listOrganizations().refresh();
	redirect(303, `/${data.slug}/dashboard`);
});

// ===========================
// Auth Forms
// ===========================

const signinSchema = v.object({
	email: v.pipe(v.string(), v.email(), v.minLength(1)),
	password: v.pipe(v.string(), v.minLength(1))
});

const signupSchema = v.object({
	email: v.pipe(v.string(), v.email(), v.minLength(1)),
	password: v.pipe(v.string(), v.minLength(8)),
	name: v.pipe(v.string(), v.minLength(1), v.maxLength(100))
});

export const signin = form(signinSchema, async (data) => {
	const { email, password } = data;

	const response = await auth.api.signInEmail({
		body: {
			email,
			password
		},
		asResponse: true
	});

	// Use response.headers for subsequent API calls to reflect the new session
	const organizations = await auth.api.listOrganizations({
		headers: getRequestEvent().request.headers
	});

	switch (response.status) {
		case 200:
			if (Array.isArray(organizations) && organizations.length > 0) {
				return redirect(303, `/${organizations[0].slug}/dashboard`);
			}
			return redirect(303, '/create-organization');
		case 401:
			return error(401, 'Invalid email or password');
		case 404:
			return error(404, 'No account found with this email');
		case 429:
			return error(429, 'Too many login attempts. Please try again later');
		case 400:
			return error(400, 'Invalid input provided');
		case 500:
			return error(500, 'Server error. Please try again later');
		default:
			return error(400, 'Failed to sign in');
	}
});

export const signup = form(signupSchema, async (data) => {
	const { email, password, name } = data;

	const response = await auth.api.signUpEmail({
		body: {
			email,
			password,
			name
		},
		asResponse: true
	});

	switch (response.status) {
		case 200: {
			// Ensure the user is signed in after sign up
			await auth.api.signInEmail({
				body: { email, password },
				asResponse: false
			});

			const organizations = await auth.api.listOrganizations({
				headers: getRequestEvent().request.headers
			});

			if (Array.isArray(organizations) && organizations.length > 0) {
				return redirect(303, `/${organizations[0].slug}/dashboard`);
			}
			return redirect(303, '/create-organization');
		}
		case 409:
			return error(409, 'An account with this email already exists');
		case 400:
			return error(400, 'Invalid input provided');
		case 500:
			return error(500, 'Server error. Please try again later');
		default:
			return error(400, 'Failed to create account');
	}
});

export const logout = command(async () => {
	const event = getRequestEvent();
	if (!event) {
		error(500, 'Request context not available');
	}

	await auth.api.signOut({
		headers: event.request.headers
	});

	return { success: true };
});
