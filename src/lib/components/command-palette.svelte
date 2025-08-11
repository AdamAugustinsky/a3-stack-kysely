<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import {
		LayoutDashboard,
		CheckSquare,
		User,
		Building,
		CreditCard,
		Plus,
		Search,
		Tag,
		Flag,
		LogOut,
		RefreshCw,
		Copy,
		Keyboard,
		Filter,
		CornerDownLeft,
		ArrowRight
	} from '@lucide/svelte';
	import { getTodos } from '@routes/(protected)/[organization_slug]/todos/todo.remote';
	import CreateTodoDialog from '@routes/(protected)/[organization_slug]/todos/components/create-todo-dialog.svelte';
	import type { Task } from '$lib/schemas/todo';
	import { useIsMac } from '$lib/hooks/use-is-mac.svelte.js';
	import Kbd from '$lib/components/kbd.svelte';
	import { navigateTo } from '@/client.utils.svelte';

	let { open = $bindable(false) } = $props();
	let search = $state('');
	let showCreateTodoDialog = $state(false);
	let searchedTodos = $state<Task[]>([]);
	let highlightedCommand = $state<CommandItem | null>(null);

	type CommandItem = {
		id: string;
		label: string;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		icon: any;
		shortcut?: string;
		action: () => void | Promise<void>;
		keywords?: string[];
		type?: 'navigation' | 'todo' | 'action';
	};

	// Detect if Mac for keyboard shortcuts
	const isMac = useIsMac();

	const navigationCommands: CommandItem[] = $derived([
		{
			id: 'nav-dashboard',
			label: 'Dashboard',
			icon: LayoutDashboard,
			shortcut: isMac ? '⌘D' : 'Ctrl+D',
			action: () => navigateTo('dashboard'),
			keywords: ['home', 'overview', 'stats'],
			type: 'navigation'
		},
		{
			id: 'nav-todos',
			label: 'Todos',
			icon: CheckSquare,
			shortcut: isMac ? '⌘T' : 'Ctrl+T',
			action: () => navigateTo('/todos'),
			keywords: ['tasks', 'list'],
			type: 'navigation'
		},
		{
			id: 'nav-account',
			label: 'Account',
			icon: User,
			shortcut: isMac ? '⌘U' : 'Ctrl+U',
			action: () => navigateTo('/account'),
			keywords: ['profile', 'settings', 'user'],
			type: 'navigation'
		},
		{
			id: 'nav-organization',
			label: 'Organization',
			icon: Building,
			action: () => navigateTo('/organization/settings'),
			keywords: ['company', 'team'],
			type: 'navigation'
		},
		{
			id: 'nav-billing',
			label: 'Billing',
			icon: CreditCard,
			action: () => navigateTo('/organization/billing'),
			keywords: ['payment', 'subscription', 'invoice'],
			type: 'navigation'
		}
	]);

	const todoCommands: CommandItem[] = [
		{
			id: 'todo-create',
			label: 'Create New Todo',
			icon: Plus,
			shortcut: 'C',
			action: () => openCreateTodoDialog(),
			keywords: ['add', 'new', 'task'],
			type: 'todo'
		},
		{
			id: 'todo-search',
			label: 'Search Todos',
			icon: Search,
			action: () => searchTodos(),
			keywords: ['find', 'filter'],
			type: 'todo'
		},
		{
			id: 'todo-filter-backlog',
			label: 'Filter: Backlog',
			icon: Filter,
			action: () => filterTodosByStatus('backlog'),
			keywords: ['status'],
			type: 'todo'
		},
		{
			id: 'todo-filter-todo',
			label: 'Filter: Todo',
			icon: Filter,
			action: () => filterTodosByStatus('todo'),
			keywords: ['status'],
			type: 'todo'
		},
		{
			id: 'todo-filter-progress',
			label: 'Filter: In Progress',
			icon: Filter,
			action: () => filterTodosByStatus('in progress'),
			keywords: ['status', 'active'],
			type: 'todo'
		},
		{
			id: 'todo-filter-done',
			label: 'Filter: Done',
			icon: Filter,
			action: () => filterTodosByStatus('done'),
			keywords: ['status', 'complete', 'finished'],
			type: 'todo'
		},
		{
			id: 'todo-priority-high',
			label: 'Filter: High Priority',
			icon: Flag,
			action: () => filterTodosByPriority('high'),
			keywords: ['urgent', 'important'],
			type: 'todo'
		},
		{
			id: 'todo-priority-medium',
			label: 'Filter: Medium Priority',
			icon: Flag,
			action: () => filterTodosByPriority('medium'),
			keywords: ['normal'],
			type: 'todo'
		},
		{
			id: 'todo-priority-low',
			label: 'Filter: Low Priority',
			icon: Flag,
			action: () => filterTodosByPriority('low'),
			keywords: ['minor'],
			type: 'todo'
		},
		{
			id: 'todo-label-bug',
			label: 'Filter: Bugs',
			icon: Tag,
			action: () => filterTodosByLabel('bug'),
			keywords: ['issue', 'problem'],
			type: 'todo'
		},
		{
			id: 'todo-label-feature',
			label: 'Filter: Features',
			icon: Tag,
			action: () => filterTodosByLabel('feature'),
			keywords: ['enhancement', 'new'],
			type: 'todo'
		},
		{
			id: 'todo-label-documentation',
			label: 'Filter: Documentation',
			icon: Tag,
			action: () => filterTodosByLabel('documentation'),
			keywords: ['docs', 'readme'],
			type: 'todo'
		}
	];

	const quickActions: CommandItem[] = $derived([
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
			id: 'action-copy-id',
			label: 'Copy User ID',
			icon: Copy,
			action: () => copyUserId(),
			keywords: ['clipboard'],
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
				executeCommand('nav-dashboard');
			}
			if (e.key === 't' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				executeCommand('nav-todos');
			}
			if (e.key === 'u' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				executeCommand('nav-account');
			}
			if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				executeCommand('action-refresh');
			}
		}
	}

	function executeCommand(commandId: string) {
		const allCommands = [...navigationCommands, ...todoCommands, ...quickActions];
		const command = allCommands.find((cmd) => cmd.id === commandId);
		if (command) {
			command.action();
			open = false;
		}
	}

	function openCreateTodoDialog() {
		showCreateTodoDialog = true;
	}

	async function searchTodos() {
		navigateTo('/todos');
	}

	function filterTodosByStatus(status: string) {
		navigateTo(`/todos?status=${status}`);
	}

	function filterTodosByPriority(priority: string) {
		navigateTo(`/todos?priority=${priority}`);
	}

	function filterTodosByLabel(label: string) {
		navigateTo(`/todos?label=${label}`);
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

	async function copyUserId() {
		try {
			const response = await fetch('/api/auth/session');
			const session = await response.json();
			if (session?.user?.id) {
				await navigator.clipboard.writeText(session.user.id);
			}
		} catch (error) {
			console.error('Failed to copy user ID:', error);
		}
	}

	function showKeyboardShortcuts() {
		const modKey = isMac ? '⌘' : 'Ctrl+';
		alert(`Keyboard Shortcuts:

${modKey}K - Open Command Palette

On Todos page:
C - Create New Todo (when not typing)

When Command Palette is open:
Ctrl+N - Navigate down
Ctrl+P - Navigate up
${modKey}D - Go to Dashboard
${modKey}T - Go to Todos
${modKey}U - Go to Account
${modKey}R - Refresh Data
? - Show this help`);
	}

	async function searchTodosLive(query: string) {
		if (query.length < 2) {
			searchedTodos = [];
			return;
		}

		try {
			const todos = await getTodos();
			if (todos.length) {
				searchedTodos = todos
					.filter((todo) => todo.text.toLowerCase().includes(query.toLowerCase()))
					.slice(0, 5);
			}
		} catch (error) {
			console.error('Failed to search todos:', error);
			searchedTodos = [];
		}
	}

	let searchTimeout: NodeJS.Timeout;
	$effect(() => {
		if (search && search.length > 1) {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				searchTodosLive(search);
			}, 300);
		} else {
			searchedTodos = [];
		}
	});

	function filterCommands(commands: CommandItem[], query: string) {
		if (!query) return commands;
		const lowerQuery = query.toLowerCase();
		return commands.filter(
			(cmd) =>
				cmd.label.toLowerCase().includes(lowerQuery) ||
				cmd.keywords?.some((keyword) => keyword.toLowerCase().includes(lowerQuery))
		);
	}

	// Get the action text for the highlighted command
	const footerActionText = $derived.by(() => {
		if (!highlightedCommand) return '';

		if (highlightedCommand.type === 'navigation') {
			return 'Go to Page';
		} else if (highlightedCommand.type === 'todo') {
			return 'Execute Action';
		} else {
			return 'Run Command';
		}
	});

	// Reset search when dialog opens
	$effect(() => {
		if (open) {
			search = '';
			searchedTodos = [];
			highlightedCommand = null;
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
			class="rounded-none bg-transparent **:data-[slot=command-input]:!h-9 **:data-[slot=command-input]:py-0 **:data-[slot=command-input-wrapper]:mb-0 **:data-[slot=command-input-wrapper]:!h-9 **:data-[slot=command-input-wrapper]:rounded-md **:data-[slot=command-input-wrapper]:border **:data-[slot=command-input-wrapper]:border-input **:data-[slot=command-input-wrapper]:bg-input/50"
		>
			<Command.Input placeholder="Type a command or search..." bind:value={search} />
			<Command.List class="no-scrollbar min-h-80 scroll-pt-2 scroll-pb-1.5">
				<Command.Empty class="py-12 text-center text-sm text-muted-foreground">
					No results found.
				</Command.Empty>

				{#if searchedTodos.length > 0}
					<Command.Group
						heading="Todo Search Results"
						class="!p-0 [&_[data-command-group-heading]]:scroll-mt-16 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
					>
						{#each searchedTodos as todo (todo.id)}
							<Command.Item
								onSelect={() => navigateTo(`/todos?highlight=${todo.id}`)}
								class="relative flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
							>
								<CheckSquare class="size-4" />
								<span class="truncate">{todo.text}</span>
								<span class="ml-auto text-xs text-muted-foreground">{todo.status}</span>
							</Command.Item>
						{/each}
					</Command.Group>
					<Command.Separator />
				{/if}

				{@const filteredNavCommands = search
					? filterCommands(navigationCommands, search)
					: navigationCommands}
				{@const filteredTodoCommands = search ? filterCommands(todoCommands, search) : todoCommands}
				{@const filteredQuickActions = search ? filterCommands(quickActions, search) : quickActions}
				{@const isOnTodosPage = page.url.pathname.endsWith('/todos')}

				{#if isOnTodosPage}
					{#if filteredTodoCommands.length > 0}
						<Command.Group
							heading="Todo Actions"
							class="!p-0 [&_[data-command-group-heading]]:scroll-mt-16 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
						>
							{#each filteredTodoCommands as command (command.id)}
								<Command.Item
									onSelect={() => executeCommand(command.id)}
									class="relative flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
								>
									{@const Icon = command.icon}
									<Icon class="size-4" />
									<span>{command.label}</span>
									{#if command.shortcut}
										<Command.Shortcut>{command.shortcut}</Command.Shortcut>
									{/if}
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}

					{#if filteredQuickActions.length > 0}
						<Command.Separator />
						<Command.Group
							heading="Quick Actions"
							class="!p-0 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
						>
							{#each filteredQuickActions as command (command.id)}
								<Command.Item
									onSelect={() => executeCommand(command.id)}
									class="relative flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
								>
									{@const Icon = command.icon}
									<Icon class="size-4" />
									<span>{command.label}</span>
									{#if command.shortcut}
										<Command.Shortcut>{command.shortcut}</Command.Shortcut>
									{/if}
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}

					{#if filteredNavCommands.length > 0}
						<Command.Separator />
						<Command.Group
							heading="Navigation"
							class="!p-0 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
						>
							{#each filteredNavCommands as command (command.id)}
								<Command.Item
									onSelect={() => executeCommand(command.id)}
									class="relative flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
								>
									<ArrowRight class="size-4" />
									<span>{command.label}</span>
									{#if command.shortcut}
										<Command.Shortcut>{command.shortcut}</Command.Shortcut>
									{/if}
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}
				{:else}
					{#if filteredNavCommands.length > 0}
						<Command.Group
							heading="Navigation"
							class="!p-0 [&_[data-command-group-heading]]:scroll-mt-16 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
						>
							{#each filteredNavCommands as command (command.id)}
								<Command.Item
									onSelect={() => executeCommand(command.id)}
									class="relative flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
								>
									<ArrowRight class="size-4" />
									<span>{command.label}</span>
									{#if command.shortcut}
										<Command.Shortcut>{command.shortcut}</Command.Shortcut>
									{/if}
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}

					{#if filteredTodoCommands.length > 0}
						<Command.Separator />
						<Command.Group
							heading="Todo Actions"
							class="!p-0 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
						>
							{#each filteredTodoCommands as command (command.id)}
								<Command.Item
									onSelect={() => executeCommand(command.id)}
									class="relative flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
								>
									{@const Icon = command.icon}
									<Icon class="size-4" />
									<span>{command.label}</span>
									{#if command.shortcut}
										<Command.Shortcut>{command.shortcut}</Command.Shortcut>
									{/if}
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}

					{#if filteredQuickActions.length > 0}
						<Command.Separator />
						<Command.Group
							heading="Quick Actions"
							class="!p-0 [&_[data-command-group-heading]]:!p-3 [&_[data-command-group-heading]]:!pb-1"
						>
							{#each filteredQuickActions as command (command.id)}
								<Command.Item
									onSelect={() => executeCommand(command.id)}
									class="relative flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
								>
									{@const Icon = command.icon}
									<Icon class="size-4" />
									<span>{command.label}</span>
									{#if command.shortcut}
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

<CreateTodoDialog bind:open={showCreateTodoDialog} />
