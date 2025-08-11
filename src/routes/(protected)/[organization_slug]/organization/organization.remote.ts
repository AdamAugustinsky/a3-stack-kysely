import { form, query, command, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { auth } from '$lib/server/auth';

/**
 * Organization remote functions:
 * - Validates inputs with Valibot
 * - Calls Better Auth server API via auth.api.*
 * - Returns normalized data
 */

/* ===========================
   Schemas
   =========================== */

// Helpers
const stringId = v.pipe(v.string(), v.minLength(1));
const slug = v.pipe(v.string(), v.minLength(1));

// Create Organization (form)
const createOrganizationSchema = v.object({
	name: v.pipe(v.string(), v.minLength(1, 'Organization name is required')),
	slug: v.pipe(v.string(), v.minLength(1)),
	logo: v.optional(v.pipe(v.string(), v.minLength(1))),
	keepCurrentActiveOrganization: v.optional(v.boolean())
});

// Update Organization (command)
const updateOrganizationSchema = v.object({
	organizationId: stringId,
	data: v.object({
		name: v.optional(v.pipe(v.string(), v.minLength(1))),
		slug: v.optional(slug),
		logo: v.optional(v.pipe(v.string(), v.minLength(1))),
		metadata: v.optional(v.record(v.string(), v.unknown()))
	})
});

// Delete Organization (command)
const deleteOrganizationSchema = v.object({
	organizationId: stringId
});

// Set Active Organization (command)
const setActiveOrganizationSchema = v.object({
	organizationId: v.optional(v.union([stringId, v.null_()])),
	organizationSlug: v.optional(slug)
});

// Invite Member (command)
const inviteMemberSchema = v.object({
	email: v.pipe(v.string(), v.email('A valid email is required')),
	// Restrict to known roles for better-auth org plugin
	role: v.union([
		v.literal('member'),
		v.literal('admin'),
		v.literal('owner'),
		v.array(v.union([v.literal('member'), v.literal('admin'), v.literal('owner')]))
	]),
	organizationId: v.optional(stringId),
	resend: v.optional(v.boolean())
});

// Accept/Reject/Cancel Invitation (command)
const invitationIdSchema = v.object({
	invitationId: stringId
});

// List Members (query)
const listMembersSchema = v.object({
	organizationId: v.optional(stringId),
	limit: v.optional(v.number()),
	offset: v.optional(v.number()),
	sortBy: v.optional(v.string()),
	sortDirection: v.optional(v.union([v.literal('asc'), v.literal('desc')])),
	filterField: v.optional(v.string()),
	filterOperator: v.optional(
		v.union([
			v.literal('eq'),
			v.literal('ne'),
			v.literal('gt'),
			v.literal('gte'),
			v.literal('lt'),
			v.literal('lte'),
			v.literal('contains')
		])
	),
	filterValue: v.optional(v.string())
});

// Update Member Role (command)
const updateMemberRoleSchema = v.object({
	memberId: stringId,
	role: v.union([
		v.literal('member'),
		v.literal('admin'),
		v.literal('owner'),
		v.array(v.union([v.literal('member'), v.literal('admin'), v.literal('owner')]))
	]),
	organizationId: v.optional(stringId)
});

// Remove Member (command)
const removeMemberSchema = v.object({
	memberIdOrEmail: v.pipe(v.string(), v.minLength(1)),
	organizationId: stringId
});

/* ===========================
   Queries
   =========================== */

// List organizations for current user
export const listOrganizations = query(async () => {
	const headers = getRequestEvent().request.headers;
	const result = await auth.api.listOrganizations({ headers });
	console.log({ result });
	return Array.isArray(result) ? result : [];
});

// Active organization: use getFullOrganization without params (defaults to active)
export const getActiveOrganization = query(async () => {
	const headers = getRequestEvent().request.headers;
	const result = await auth.api.getFullOrganization({ headers });
	return result ?? null;
});

// Get full organization detail (optionally by id or slug). Defaults to active org if not provided.
const getFullOrganizationSchema = v.object({
	organizationId: v.optional(stringId),
	organizationSlug: v.optional(slug),
	membersLimit: v.optional(v.number())
});
export const getFullOrganization = query(getFullOrganizationSchema, async (args) => {
	const headers = getRequestEvent().request.headers;
	const result = await auth.api.getFullOrganization({
		headers,
		query: {
			organizationId: args.organizationId,
			organizationSlug: args.organizationSlug,
			membersLimit: args.membersLimit
		}
	});
	if (!result) error(404, 'Organization not found');
	return result;
});

// List members for an organization or active org
export const listMembers = query(listMembersSchema, async (args) => {
	const headers = getRequestEvent().request.headers;
	const result = await auth.api.listMembers({
		headers,
		query: {
			organizationId: args.organizationId,
			limit: args.limit,
			offset: args.offset,
			sortBy: args.sortBy,
			sortDirection: args.sortDirection,
			filterField: args.filterField,
			filterOperator: args.filterOperator,
			filterValue: args.filterValue
		}
	});
	return result ?? { members: [], count: 0 };
});

// List invitations for an organization or active org
const listInvitationsSchema = v.object({
	organizationId: v.optional(stringId)
});
export const listInvitations = query(listInvitationsSchema, async (args) => {
	const headers = getRequestEvent().request.headers;
	const result = await auth.api.listInvitations({
		headers,
		query: {
			organizationId: args.organizationId
		}
	});
	return Array.isArray(result) ? result : [];
});

/* ===========================
   Commands / Forms
   =========================== */

// Create organization (form, for progressive enhancement)
export const createOrganization = form(async (data) => {
	const obj = Object.fromEntries(data.entries());
	const parsed = v.safeParse(createOrganizationSchema, obj);
	if (!parsed.success) {
		const message = parsed.issues?.[0]?.message ?? 'Invalid organization data';
		error(400, message);
	}
	const { name, slug, logo, keepCurrentActiveOrganization } = parsed.output;

	const headers = getRequestEvent().request.headers;
	const result = await auth.api.createOrganization({
		headers,
		body: {
			name,
			slug,
			logo,
			keepCurrentActiveOrganization
		}
	});
	return result;
});

// Update organization
export const updateOrganization = command(
	updateOrganizationSchema,
	async ({ organizationId, data }) => {
		const headers = getRequestEvent().request.headers;
		const result = await auth.api.updateOrganization({
			headers,
			body: {
				organizationId,
				data
			}
		});
		return result;
	}
);

// Delete organization
export const deleteOrganization = command(deleteOrganizationSchema, async ({ organizationId }) => {
	const headers = getRequestEvent().request.headers;
	await auth.api.deleteOrganization({
		headers,
		body: {
			organizationId
		}
	});
	return { ok: true };
});

// Set active organization (or unset with null)
export const setActiveOrganization = command(setActiveOrganizationSchema, async (args) => {
	if (typeof args.organizationId === 'undefined' && typeof args.organizationSlug === 'undefined') {
		error(400, 'organizationId or organizationSlug is required (or null to unset)');
	}

	const headers = getRequestEvent().request.headers;
	await auth.api.setActiveOrganization({
		headers,
		body: {
			organizationId: typeof args.organizationId === 'undefined' ? undefined : args.organizationId,
			organizationSlug: args.organizationSlug
		}
	});
	return { ok: true };
});

// Invite a member to an organization (or active org)
export const inviteMember = command(inviteMemberSchema, async (args) => {
	const headers = getRequestEvent().request.headers;
	const result = await auth.api.createInvitation({
		headers,
		body: {
			email: args.email,
			role: args.role,
			organizationId: args.organizationId,
			resend: args.resend
		}
	});
	return result;
});

// Accept invitation
export const acceptInvitation = command(invitationIdSchema, async ({ invitationId }) => {
	const headers = getRequestEvent().request.headers;
	const result = await auth.api.acceptInvitation({
		headers,
		body: { invitationId }
	});
	return result;
});

// Reject invitation
export const rejectInvitation = command(invitationIdSchema, async ({ invitationId }) => {
	const headers = getRequestEvent().request.headers;
	await auth.api.rejectInvitation({
		headers,
		body: { invitationId }
	});
	return { ok: true };
});

// Cancel invitation
export const cancelInvitation = command(invitationIdSchema, async ({ invitationId }) => {
	const headers = getRequestEvent().request.headers;
	await auth.api.cancelInvitation({
		headers,
		body: { invitationId }
	});
	return { ok: true };
});

// Update member role
export const updateMemberRole = command(
	updateMemberRoleSchema,
	async ({ memberId, role, organizationId }) => {
		const headers = getRequestEvent().request.headers;
		await auth.api.updateMemberRole({
			headers,
			body: {
				memberId,
				role,
				organizationId
			}
		});
		return { ok: true };
	}
);

// Remove member
export const removeMember = command(
	removeMemberSchema,
	async ({ memberIdOrEmail, organizationId }) => {
		const headers = getRequestEvent().request.headers;
		await auth.api.removeMember({
			headers,
			body: {
				memberIdOrEmail,
				organizationId
			}
		});
		return { ok: true };
	}
);
