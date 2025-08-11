<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import CreateOrganizationDialog from './create-organization-dialog.svelte';
	import { authClient } from '$lib/auth-client';
	import { page } from '$app/state';

	type Organization = {
		id: string;
		name: string;
		slug?: string;
		logo?: string | null;
		metadata?: Record<string, unknown> | null;
	};

	import { GalleryVerticalEndIcon, AudioWaveformIcon, CommandIcon } from '@lucide/svelte';
	import type { Subscription } from '@better-auth/stripe';
	import { goto } from '$app/navigation';

	let { orgs = [], activeOrganization = null } = $props<{
		orgs: Organization[];
		activeOrganization: Organization | null;
	}>();

	// Fallback icons map by index to keep current UI vibe when no logo is set
	const fallbackLogos = [GalleryVerticalEndIcon, AudioWaveformIcon, CommandIcon];

	// Track subscriptions for organizations
	let subscriptions = $state<Record<string, Subscription>>({});
	let loadingSubscriptions = $state(false);

	async function loadSubscriptions() {
		if (orgs.length === 0) return;

		loadingSubscriptions = true;
		try {
			for (const org of orgs) {
				const subs = await authClient.subscription.list({
					query: { referenceId: org.id }
				});
				const activeSub = subs.data?.find(
					(sub) => sub.status === 'active' || sub.status === 'trialing'
				);
				if (activeSub) {
					subscriptions[org.id] = activeSub;
				}
			}
		} catch (error) {
			console.error('Failed to load subscriptions:', error);
		} finally {
			loadingSubscriptions = false;
		}
	}

	$effect(() => {
		loadSubscriptions();
	});

	function getPlan(org: Organization): string {
		const sub = subscriptions[org.id];
		if (!sub) return 'Free';

		const planName = sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
		if (sub.status === 'trialing') {
			return `${planName} (Trial)`;
		}
		return planName;
	}

	const sidebar = useSidebar();
	let showCreateOrgDialog = $state(false);

	async function handleSelect(org: Organization) {
		if (page.params.organization_slug && org.slug)
			goto(page.url.pathname.replace(page.params.organization_slug, org.slug), {
				replaceState: true,
				noScroll: true
			});
	}
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						{...props}
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						{#if activeOrganization}
							{@const FallbackIcon =
								fallbackLogos[
									orgs.findIndex((o: Organization) => o.id === activeOrganization.id) %
										fallbackLogos.length
								]}
							<div
								class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
							>
								<FallbackIcon class="size-4" />
							</div>
						{:else}
							<div
								class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
							>
								<GalleryVerticalEndIcon class="size-4" />
							</div>
						{/if}
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">
								{activeOrganization?.name ?? 'Select organization'}
							</span>
							<span class="truncate text-xs">
								{#if activeOrganization}
									{loadingSubscriptions ? 'Loading...' : getPlan(activeOrganization)}
								{/if}
							</span>
						</div>
						<ChevronsUpDownIcon class="ml-auto" />
					</Sidebar.MenuButton>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
				align="start"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				sideOffset={4}
			>
				<DropdownMenu.Label class="text-xs text-muted-foreground">Teams</DropdownMenu.Label>
				{#each orgs as org, index (org.id)}
					{@const FallbackIcon = fallbackLogos[index % fallbackLogos.length]}
					<DropdownMenu.Item onSelect={() => handleSelect(org)} class="gap-2 p-2">
						<div class="flex size-6 items-center justify-center rounded-md border">
							<FallbackIcon class="size-3.5 shrink-0" />
						</div>
						{org.name}
						<DropdownMenu.Shortcut>⌘{index + 1}</DropdownMenu.Shortcut>
					</DropdownMenu.Item>
				{/each}
				<DropdownMenu.Separator />
				<DropdownMenu.Item class="gap-2 p-2" onSelect={() => (showCreateOrgDialog = true)}>
					<div class="flex size-6 items-center justify-center rounded-md border bg-transparent">
						<PlusIcon class="size-4" />
					</div>
					<div class="font-medium text-muted-foreground">Add Organization</div>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>

<CreateOrganizationDialog bind:open={showCreateOrgDialog} />
