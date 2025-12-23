<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import SiteHeader from '$lib/components/site-header.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { listOrganizations, setActiveOrganization } from '$lib/remote/organization.remote';

	const { children, data }: { children: Snippet; data: LayoutData } = $props();

	// Use remote function for organization list
	const organizationsQuery = listOrganizations();
	const organizations = $derived(organizationsQuery.current ?? []);

	// Set active organization when URL slug changes
	$effect(() => {
		const organization = organizations.find(
			(org) => org.slug === page.params.organization_slug
		);
		if (organization) {
			setActiveOrganization({
				organizationId: organization.id
			});
		}
	});
</script>

<Sidebar.Provider
	style="--sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 12);"
>
	<AppSidebar variant="inset" user={data.user} />
	<Sidebar.Inset>
		<SiteHeader />
		{@render children()}
	</Sidebar.Inset>
</Sidebar.Provider>
