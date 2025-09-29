import { query, getRequestEvent } from '$app/server';
import { eden } from '$lib/server/eden';
import { headersToRecord } from '$lib/server/headers-helper';
import { error } from '@sveltejs/kit';

// Dashboard statistics query
export const getDashboardStats = query(async () => {
	const event = getRequestEvent();
	const organizationSlug = event.params?.organization_slug;
	if (!organizationSlug) {
		error(400, 'Organization slug not found');
	}
	const headers = headersToRecord(event.request.headers);
	const response = await eden.api.org({ organizationSlug }).dashboard.stats.get({ headers });

	if (response.error) {
		error(response.status, JSON.stringify(response.error.value));
	}

	return response.data;
});

// Recent todos activity (for charts)
export const getRecentActivity = query(async () => {
	const event = getRequestEvent();
	const organizationSlug = event.params?.organization_slug;
	if (!organizationSlug) {
		error(400, 'Organization slug not found');
	}
	const headers = headersToRecord(event.request.headers);
	const response = await eden.api.org({ organizationSlug }).dashboard.activity.get({ headers });

	if (response.error) {
		error(500, 'Failed to fetch activity data');
	}
	if (!Array.isArray(response.data)) {
		error(500, 'Invalid activity data format');
	}

	return response.data;
});
