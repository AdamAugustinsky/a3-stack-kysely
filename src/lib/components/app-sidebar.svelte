<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import CameraIcon from '@tabler/icons-svelte/icons/camera';
	import CreditCardIcon from '@tabler/icons-svelte/icons/credit-card';
	import DashboardIcon from '@tabler/icons-svelte/icons/dashboard';
	import DatabaseIcon from '@tabler/icons-svelte/icons/database';
	import FileAiIcon from '@tabler/icons-svelte/icons/file-ai';
	import FileDescriptionIcon from '@tabler/icons-svelte/icons/file-description';
	import FileWordIcon from '@tabler/icons-svelte/icons/file-word';
	import HelpIcon from '@tabler/icons-svelte/icons/help';
	import ListDetailsIcon from '@tabler/icons-svelte/icons/list-details';
	import ReportIcon from '@tabler/icons-svelte/icons/report';
	import SearchIcon from '@tabler/icons-svelte/icons/search';
	import SettingsIcon from '@tabler/icons-svelte/icons/settings';
	import type { User } from 'better-auth';
	import type { ComponentProps } from 'svelte';
	import NavMain from './nav-main.svelte';
	import NavUser from './nav-user.svelte';
	import OrgSwitcher from './org-switcher.svelte';
	import CreateOrganizationDialog from './create-organization-dialog.svelte';
	import { authClient } from '$lib/auth-client';
	import CommandPalette from './command-palette.svelte';
	import SearchIcon2 from '@lucide/svelte/icons/search';
	import Kbd from '$lib/components/kbd.svelte';
	import { useIsMac } from '$lib/hooks/use-is-mac.svelte.js';

	type Organization = {
		id: string;
		name: string;
		slug?: string;
		logo?: string | null;
		metadata?: Record<string, unknown> | null;
	};

	type Props = ComponentProps<typeof Sidebar.Root> & {
		user: User;
		organizations: Organization[] | { data?: Organization[] } | null;
	};

	let { user, organizations: incomingOrganizations, ...restProps }: Props = $props();

	// Normalize organizations from layout load (it may be an object with data or a plain array)
	const organizations = $derived(
		Array.isArray(incomingOrganizations)
			? incomingOrganizations
			: (incomingOrganizations?.data ?? [])
	);

	// Use Better Auth's client-side active organization hook
	const activeOrganization = authClient.useActiveOrganization();

	// Dialog state
	let showCreateOrgDialog = $state(false);
	let showCommandPalette = $state(false);

	// Platform detection for keyboard shortcuts
	const isMac = useIsMac();

	// Handle keyboard shortcut to open command palette
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			showCommandPalette = true;
		}
	}

	// If there are no organizations from the server, prompt creation dialog
	$effect(() => {
		if (organizations.length === 0) {
			showCreateOrgDialog = true;
		}
	});

	const data = {
		navMain: [
			{
				title: 'Dashboard',
				url: '/dashboard',
				icon: DashboardIcon
			},
			{
				title: "ToDo's",
				url: '/todos',
				icon: ListDetailsIcon
			},
			{
				title: 'Organization',
				url: '/organization/settings',
				icon: SettingsIcon
			},
			{
				title: 'Billing',
				url: '/organization/billing',
				icon: CreditCardIcon
			}
		],
		navClouds: [
			{
				title: 'Capture',
				icon: CameraIcon,
				isActive: true,
				url: '#',
				items: [
					{
						title: 'Active Proposals',
						url: '#'
					},
					{
						title: 'Archived',
						url: '#'
					}
				]
			},
			{
				title: 'Proposal',
				icon: FileDescriptionIcon,
				url: '#',
				items: [
					{
						title: 'Active Proposals',
						url: '#'
					},
					{
						title: 'Archived',
						url: '#'
					}
				]
			},
			{
				title: 'Prompts',
				icon: FileAiIcon,
				url: '#',
				items: [
					{
						title: 'Active Proposals',
						url: '#'
					},
					{
						title: 'Archived',
						url: '#'
					}
				]
			}
		],
		navSecondary: [
			{
				title: 'Settings',
				url: '#',
				icon: SettingsIcon
			},
			{
				title: 'Get Help',
				url: '#',
				icon: HelpIcon
			},
			{
				title: 'Search',
				url: '#',
				icon: SearchIcon
			}
		],
		documents: [
			{
				name: 'Data Library',
				url: '#',
				icon: DatabaseIcon
			},
			{
				name: 'Reports',
				url: '#',
				icon: ReportIcon
			},
			{
				name: 'Word Assistant',
				url: '#',
				icon: FileWordIcon
			}
		]
	};
</script>

<svelte:document onkeydown={handleKeydown} />

<Sidebar.Root collapsible="offcanvas" {...restProps}>
	<Sidebar.Header>
		{#if organizations.length === 0}
			<div class="px-2 py-1.5 text-sm text-muted-foreground">No organizations yet</div>
		{:else}
			{#key organizations.length + '-' + ($activeOrganization.data?.id ?? 'none')}
				<OrgSwitcher orgs={organizations} activeOrganization={$activeOrganization.data} />
			{/key}
		{/if}
	</Sidebar.Header>
	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupContent class="px-2">
				<Sidebar.Menu>
					<Sidebar.MenuItem>
						<Sidebar.MenuButton
							tooltipContent="Search (${isMac ? '⌘' : 'Ctrl+'}K)"
							onclick={() => (showCommandPalette = true)}
							class="relative bg-muted/50 text-muted-foreground shadow-sm ring-1 ring-neutral-200/50 hover:bg-muted hover:text-foreground dark:ring-neutral-700/50"
						>
							<SearchIcon2 class="size-4" />
							<span class="flex-1 text-left">Search...</span>
							<div class="ml-auto flex gap-0.5">
								<Kbd content={isMac ? '⌘' : 'Ctrl'} />
								<Kbd content="K" />
							</div>
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
		<NavMain items={data.navMain} />
		<!-- <NavSecondary items={data.navSecondary} class="mt-auto" /> -->
	</Sidebar.Content>
	<Sidebar.Footer>
		<NavUser {user} />
	</Sidebar.Footer>
</Sidebar.Root>

<CreateOrganizationDialog bind:open={showCreateOrgDialog} />
<CommandPalette bind:open={showCommandPalette} />
