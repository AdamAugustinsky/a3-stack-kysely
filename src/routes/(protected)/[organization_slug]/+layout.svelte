<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import SiteHeader from '$lib/components/site-header.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { authClient } from '@/auth-client';

	const { children, data }: { children: Snippet; data: LayoutData } = $props();

	$effect(() => {
		const organization = data.organizations.find(
			(org) => org.slug === page.params.organization_slug
		);
		console.log('setting active organization:', organization.slug);
		authClient.organization.setActive({
			organizationId: organization.id
		});
	});
</script>

<Sidebar.Provider
	style="--sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 12);"
>
	<AppSidebar variant="inset" user={data.user} organizations={data.organizations} />
	<Sidebar.Inset>
		<SiteHeader />
		{@render children()}
	</Sidebar.Inset>
</Sidebar.Provider>
