<script lang="ts">
	import type { LayoutData } from './$types';
	import * as Alert from '$lib/components/ui/alert';
	import InfoCircleIcon from '@tabler/icons-svelte/icons/info-circle';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	let { children } = $props<{
		data: LayoutData;
		children: import('svelte').Snippet;
	}>();

	let loading = $state(true);

	// Use Better Auth's client-side active organization hook
	const activeOrganization = authClient.useActiveOrganization();

	$effect(() => {
		// Check if there's an active organization
		if (!$activeOrganization.data && !loading) {
			// No active organization, redirect to global dashboard
			goto('/sign-in');
		}
		loading = false;
	});
</script>

{#if loading}
	<div class="flex min-h-screen items-center justify-center">
		<div class="text-center">
			<div class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
			<p class="text-muted-foreground">Loading organization...</p>
		</div>
	</div>
{:else if $activeOrganization.data}
	{@render children()}
{:else}
	<div class="container max-w-4xl py-8">
		<Alert.Root variant="destructive">
			<InfoCircleIcon class="h-4 w-4" />
			<Alert.Title>No Organization Selected</Alert.Title>
			<Alert.Description>
				Please select an organization from the sidebar to access this page.
			</Alert.Description>
		</Alert.Root>
	</div>
{/if}
