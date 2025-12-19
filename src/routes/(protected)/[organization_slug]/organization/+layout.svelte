<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/state';

	type Organization = {
		id: string;
		name: string;
		slug?: string | null;
		logo?: string | null;
		metadata?: Record<string, unknown> | null;
	};

	let { children, data } = $props<{
		data: LayoutData;
		children: import('svelte').Snippet;
	}>();

	// Check if current organization matches the URL param
	const currentOrg = $derived(
		(data.organizations as Organization[] | undefined)?.find(
			(org: Organization) => org.slug === page.params.organization_slug
		)
	);
</script>

{#if currentOrg}
	{@render children()}
{:else}
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-center">
			<div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
			<p class="text-muted-foreground">Loading organization...</p>
		</div>
	</div>
{/if}
