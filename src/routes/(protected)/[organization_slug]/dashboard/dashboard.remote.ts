import { query, getRequestEvent } from '$app/server';
import { eden } from '$lib/server/eden';
import { headersToRecord } from '$lib/server/headers-helper';
import { error } from '@sveltejs/kit';

// Dashboard statistics query
export const getDashboardStats = query(async () => {
	const headers = headersToRecord(getRequestEvent().request.headers);
	const response = await eden.api.dashboard.stats.get({ headers });

	if (response.error) {
		error(500, 'Failed to fetch dashboard stats');
	}

	return response.data;
});

// Recent todos activity (for charts)
export const getRecentActivity = query(async () => {
	const headers = headersToRecord(getRequestEvent().request.headers);
	const response = await eden.api.dashboard.activity.get({ headers });

	if (response.error) {
		error(500, 'Failed to fetch activity data');
	}

	return response.data;
});
