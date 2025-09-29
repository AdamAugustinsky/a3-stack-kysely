<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import {
		LayoutDashboard,
		User,
		Building,
		RefreshCw,
		LogOut,
		Keyboard,
		Funnel,
		CornerDownLeft,
		ArrowLeft,
		ArrowRight,
		ShoppingCart,
		TrendingUp,
		GalleryVerticalEndIcon,
		AudioWaveformIcon,
		CommandIcon
	} from '@lucide/svelte';

	import ListDetailsIcon from '@tabler/icons-svelte/icons/list-details';
	import { useIsMac } from '$lib/hooks/use-is-mac.svelte.js';
	import Kbd from '$lib/components/kbd.svelte';
	import { navigateToInActiveOrg, changeActiveOrg } from '@/client.utils.svelte';
	import { SvelteDate } from 'svelte/reactivity';

	type Organization = {
		id: string;
		name: string;
		slug?: string | null;
		logo?: string | null;
		metadata?: Record<string, unknown> | null;
	};

	type ActiveOrganization = { id: string; slug?: string | null } | null | undefined;

	let {
		open = $bindable(false),
		organizations = [] as Organization[],
		activeOrganization = null as ActiveOrganization
	} = $props<{
		open?: boolean;
		organizations?: Organization[];
		activeOrganization?: ActiveOrganization;
	}>();

	let highlightedCommand = $state<CommandItem | null>(null);
	let paletteMode = $state<'default' | 'change-org'>('default');
	let commandValue = $state('');

	let inputPlaceholder = $derived(
		paletteMode === 'change-org'
			? 'Select an organization to switch'
			: 'Type a command or search...'
	);

	let inputValue = $state('');

	type CommandItem = {
		id: string;
		label: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: any;
		shortcut?: string;
		action: () => void | Promise<void>;
		keywords?: string[];
		type?: 'navigation' | 'customer' | 'action' | 'organization';
		disabled?: boolean;
		badge?: string;
		closeOnExecute?: boolean;
	};

	// Detect if Mac for keyboard shortcuts
	const isMac = useIsMac();
	const fallbackOrgIcons = [GalleryVerticalEndIcon, AudioWaveformIcon, CommandIcon];

	const navigationCommands: CommandItem[] = $derived([
		{
			id: 'nav-dashboard',
			label: 'Dashboard',
			icon: LayoutDashboard,
			shortcut: isMac ? '⌘D' : 'Ctrl+D',
			action: () => navigateToInActiveOrg('dashboard'),
			keywords: ['home', 'overview', 'stats'],
			type: 'navigation'
		},
		{
			id: 'nav-customers',
			label: "ToDo's",
			icon: ListDetailsIcon,
			shortcut: isMac ? '⌘C' : 'Ctrl+C',
			action: () => navigateToInActiveOrg('/todos'),
			keywords: ['users', 'clients', 'sales'],
			type: 'navigation'
		},
		{
			id: 'nav-account',
			label: 'Account',
			icon: User,
			shortcut: isMac ? '⌘U' : 'Ctrl+U',
			action: () => navigateToInActiveOrg('/account'),
			keywords: ['profile', 'settings', 'user'],
			type: 'navigation'
		},
		{
			id: 'nav-organization',
			label: 'Organization',
			icon: Building,
			action: () => navigateToInActiveOrg('/organization/settings'),
			keywords: ['company', 'team'],
			type: 'navigation'
		}
		// {
		// 	id: 'nav-billing',
		// 	label: 'Billing',
		// 	icon: CreditCard,
		// 	action: () => navigateTo('/organization/billing'),
		// 	keywords: ['payment', 'subscription', 'invoice'],
		// 	type: 'navigation'
		// }
	]);

	const quickActions: CommandItem[] = $derived([
		{
			id: 'action-change-organization',
			label: 'Change Organization',
			icon: Building,
			action: () => {
				paletteMode = 'change-org';
				commandValue = '';
				highlightedCommand = null;
				inputValue = '';
			},
			keywords: ['switch', 'organization', 'team', 'workspace'],
			type: 'action',
			closeOnExecute: false
		},
		{
			id: 'action-signout',
			label: 'Sign Out',
			icon: LogOut,
			action: () => signOut(),
			keywords: ['logout', 'exit'],
			type: 'action'
		},
		{
			id: 'action-refresh',
			label: 'Refresh Data',
			icon: RefreshCw,
			shortcut: isMac ? '⌘R' : 'Ctrl+R',
			action: () => refreshData(),
			keywords: ['reload', 'update'],
			type: 'action'
		},
		{
			id: 'action-shortcuts',
			label: 'Keyboard Shortcuts',
			icon: Keyboard,
			shortcut: '?',
			action: () => showKeyboardShortcuts(),
			keywords: ['help', 'hotkeys'],
			type: 'action'
		}
	]);

	const organizationCommands: CommandItem[] = $derived(
		organizations.flatMap((org: Organization, index: number) => {
			if (!org.slug) return [];
			const isActive = activeOrganization?.id === org.id;
			const Icon = fallbackOrgIcons[index % fallbackOrgIcons.length] ?? Building;
			return [
				{
					id: `org-${org.id}`,
					label: org.name,
					icon: Icon,
					action: () => changeActiveOrg(org.slug!),
					keywords: [org.slug, org.name],
					type: 'organization',
					badge: isActive ? 'Active' : undefined,
					disabled: isActive
				}
			];
		})
	);

	function handleKeydown(e: KeyboardEvent) {
		if (open) {
			// Navigation shortcuts for command palette
			if (e.key === 'n' && e.ctrlKey) {
				e.preventDefault();
				// Navigate down in command palette (handled by Command component)
				return;
			}
			if (e.key === 'p' && e.ctrlKey) {
				e.preventDefault();
				// Navigate up in command palette (handled by Command component)
				return;
			}

			// Command shortcuts
			if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				void executeCommand('nav-dashboard');
			}
			if (e.key === 'c' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				void executeCommand('nav-customers');
			}
			if (e.key === 'u' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				void executeCommand('nav-account');
			}
			if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				void executeCommand('action-refresh');
			}
		}
	}

	async function executeCommand(commandId: string) {
		const allCommands = [...organizationCommands, ...navigationCommands, ...quickActions];
		const command = allCommands.find((cmd) => cmd.id === commandId);
		if (command && !command.disabled) {
			await command.action();
			const shouldClose = command.closeOnExecute ?? true;
			if (shouldClose) {
				commandValue = '';
				paletteMode = 'default';
				highlightedCommand = null;
				open = false;
			} else {
				highlightedCommand = null;
				commandValue = '';
			}
		}
	}

	function clearAllFilters() {
		// Clear URL params for filters
		const url = new URL(window.location.href);
		url.searchParams.delete('filters');
		window.history.replaceState({}, '', url);
		window.location.reload();
	}

	function filterByHighCommission() {
		// Add filter for commission > 100
		const url = new URL(window.location.href);
		const filterParam = JSON.stringify([
			{
				id: 'high-commission',
				field: 'total_commission',
				operator: 'greater_than',
				value: 100,
				type: 'number'
			}
		]);
		url.searchParams.set('filters', filterParam);
		window.location.href = url.toString();
	}

	function filterByMultipleOrders() {
		// Add filter for order_count > 1
		const url = new URL(window.location.href);
		const filterParam = JSON.stringify([
			{
				id: 'multiple-orders',
				field: 'order_count',
				operator: 'greater_than',
				value: 1,
				type: 'number'
			}
		]);
		url.searchParams.set('filters', filterParam);
		window.location.href = url.toString();
	}

	function setDateRangeToday() {
		const today = new Date().toISOString().split('T')[0];
		const url = new URL(window.location.href);
		url.searchParams.set('startDate', today);
		url.searchParams.set('endDate', today);
		window.location.href = url.toString();
	}

	function setDateRangeThisWeek() {
		const today = new Date();
		const startOfWeek = new SvelteDate(today);
		startOfWeek.setDate(today.getDate() - today.getDay());
		const endOfWeek = new SvelteDate(startOfWeek);
		endOfWeek.setDate(startOfWeek.getDate() + 6);

		const url = new URL(window.location.href);
		url.searchParams.set('startDate', startOfWeek.toISOString().split('T')[0]);
		url.searchParams.set('endDate', endOfWeek.toISOString().split('T')[0]);
		window.location.href = url.toString();
	}

	function setDateRangeThisMonth() {
		const today = new Date();
		const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
		const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

		const url = new URL(window.location.href);
		url.searchParams.set('startDate', startOfMonth.toISOString().split('T')[0]);
		url.searchParams.set('endDate', endOfMonth.toISOString().split('T')[0]);
		window.location.href = url.toString();
	}

	async function signOut() {
		try {
			const response = await fetch('/api/auth/sign-out', { method: 'POST' });
			if (response.ok) {
				goto('/sign-in');
			}
		} catch (error) {
			console.error('Failed to sign out:', error);
		}
	}

	function refreshData() {
		window.location.reload();
	}

	function showKeyboardShortcuts() {
		const modKey = isMac ? '⌘' : 'Ctrl+';
		alert(`Keyboard Shortcuts:

${modKey}K - Open Command Palette

On Customers page:
C - Clear All Filters
T - Set Date Range to Today
R - Clear Filters (when not typing)

When Command Palette is open:
Ctrl+N - Navigate down
Ctrl+P - Navigate up
${modKey}D - Go to Dashboard
${modKey}C - Go to Customers
${modKey}U - Go to Account
${modKey}R - Refresh Data
? - Show this help`);
	}

	// Filtering is handled internally by the Command component.

	// Get the action text for the highlighted command
	const footerActionText = $derived.by(() => {
		if (!highlightedCommand) {
			return paletteMode === 'change-org' ? 'Select Organization' : '';
		}

		if (highlightedCommand.type === 'navigation') {
			return 'Go to Page';
		} else if (highlightedCommand.type === 'customer') {
			return 'Execute Action';
		} else if (highlightedCommand.type === 'organization') {
			return highlightedCommand.disabled ? 'Current Organization' : 'Switch Organization';
		} else {
			return 'Run Command';
		}
	});

	// Reset highlighted command when dialog opens
	$effect(() => {
		if (open) {
			highlightedCommand = null;
			paletteMode = 'default';
			commandValue = '';
			inputValue = '';
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		showCloseButton={false}
		class="rounded-xl border-none bg-clip-padding p-2 pb-11 shadow-2xl ring-4 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800"
		onkeydown={handleKeydown}
	>
		<Dialog.Header class="sr-only">
			<Dialog.Title>Command Palette</Dialog.Title>
			<Dialog.Description>Search for commands and actions</Dialog.Description>
		</Dialog.Header>
		<Command.Root
			bind:value={commandValue}
			class="rounded-none bg-transparent **:data-[slot=command-input]:!h-9 **:data-[slot=command-input]:py-0 **:data-[slot=command-input-wrapper]:mb-0 **:data-[slot=command-input-wrapper]:!h-9 **:data-[slot=command-input-wrapper]:rounded-md **:data-[slot=command-input-wrapper]:border **:data-[slot=command-input-wrapper]:border-input **:data-[slot=command-input-wrapper]:bg-input/50"
		>
			<Command.Input placeholder={inputPlaceholder} autofocus bind:value={inputValue} />
			<Command.List class="no-scrollbar min-h-80 scroll-pt-2 scroll-pb-1.5">
				<Command.Empty class="py-12 text-center text-sm text-muted-foreground">
					No results found.
				</Command.Empty>

				{@const isOnCustomersPage = page.url.pathname.endsWith('/customers')}

				{#if paletteMode === 'change-org'}
					{#if organizationCommands.length > 0}
						<Command.Group
							heading="Organizations"
							class="!p-0 [&_[data-command-group-heading]]:scroll-mt-16 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
						>
							{#each organizationCommands as command (command.id)}
								<Command.Item
									disabled={command.disabled}
									value={`${command.label} ${(command.keywords ?? []).join(' ')}`}
									onSelect={() => void executeCommand(command.id)}
									class="relative flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
								>
									{@const Icon = command.icon}
									<Icon class="size-4 shrink-0" />
									<span class="flex-1 truncate">{command.label}</span>
									{#if command.badge}
										<span class="ml-auto text-xs font-medium text-muted-foreground"
											>{command.badge}</span
										>
									{/if}
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}

					<Command.Separator />
					<Command.Group
						heading="Actions"
						class="!p-0 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
					>
						<Command.Item
							value="Back to all commands"
							onSelect={() => {
								paletteMode = 'default';
								commandValue = '';
								highlightedCommand = null;
							}}
							class="relative flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
						>
							<ArrowLeft class="size-4 shrink-0" />
							<span class="flex-1 truncate">Back to all commands</span>
						</Command.Item>
					</Command.Group>
				{:else}
					{#if navigationCommands.length > 0}
						<Command.Group
							heading="Navigation"
							class="!p-0 [&_[data-command-group-heading]]:scroll-mt-16 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
						>
							{#each navigationCommands as command (command.id)}
								<Command.Item
									disabled={command.disabled}
									value={`${command.label} ${(command.keywords ?? []).join(' ')}`}
									onSelect={() => void executeCommand(command.id)}
									class="relative flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
								>
									<ArrowRight class="size-4 shrink-0" />
									<span class="flex-1 truncate">{command.label}</span>
									{#if command.badge}
										<span class="ml-auto text-xs font-medium text-muted-foreground"
											>{command.badge}</span
										>
									{:else if command.shortcut}
										<Command.Shortcut>{command.shortcut}</Command.Shortcut>
									{/if}
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}

					{#if quickActions.length > 0}
						<Command.Separator />
						<Command.Group
							heading="Quick Actions"
							class="!p-0 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
						>
							{#each quickActions as command (command.id)}
								<Command.Item
									disabled={command.disabled}
									value={`${command.label} ${(command.keywords ?? []).join(' ')}`}
									onSelect={() => void executeCommand(command.id)}
									class="relative flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
								>
									{@const Icon = command.icon}
									<Icon class="size-4 shrink-0" />
									<span class="flex-1 truncate">{command.label}</span>
									{#if command.badge}
										<span class="ml-auto text-xs font-medium text-muted-foreground"
											>{command.badge}</span
										>
									{:else if command.shortcut}
										<Command.Shortcut>{command.shortcut}</Command.Shortcut>
									{/if}
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}
				{/if}
			</Command.List>
		</Command.Root>
		<div
			class="absolute inset-x-0 bottom-0 z-20 flex h-10 items-center gap-2 rounded-b-xl border-t border-t-neutral-100 bg-neutral-50 px-4 text-xs font-medium text-muted-foreground dark:border-t-neutral-700 dark:bg-neutral-800"
		>
			<div class="flex items-center gap-2">
				<Kbd content={CornerDownLeft} />
				{#if footerActionText}
					{footerActionText}
				{:else}
					Select Command
				{/if}
			</div>
			<Separator orientation="vertical" class="!h-4" />
			<div class="flex items-center gap-1">
				<Kbd content={isMac ? '⌘' : 'Ctrl'} />
				<Kbd content="K" class="aspect-square" />
				Command Palette
			</div>
			{#if highlightedCommand?.shortcut}
				<Separator orientation="vertical" class="!h-4" />
				<div class="flex items-center gap-1">
					Shortcut: {highlightedCommand.shortcut}
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
