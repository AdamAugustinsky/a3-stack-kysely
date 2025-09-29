import {
	LayoutDashboard,
	User,
	Building,
	RefreshCw,
	LogOut,
	Keyboard,
	ArrowLeft,
	Plus,
	Download,
	Calendar,
	TrendingUp,
	Users,
	Settings,
	CreditCard,
	GalleryVerticalEndIcon,
	AudioWaveformIcon,
	CommandIcon,
	ListCheck,
	Archive,
	CheckSquare
} from '@lucide/svelte';
import ListDetailsIcon from '@tabler/icons-svelte/icons/list-details';
import { navigateToInActiveOrg, changeActiveOrg } from '@/client.utils.svelte';
import { goto } from '$app/navigation';

// Type definitions
export type CommandCategory = 'navigation' | 'action' | 'organization' | 'page-specific' | 'filter';

export type CommandVisibility = {
	routes?: string[]; // Show only on these exact routes
	excludeRoutes?: string[]; // Hide on these routes
	routePatterns?: RegExp[]; // Match route patterns
	requiresAuth?: boolean; // Requires authentication
	requiresOrg?: boolean; // Requires active organization
	custom?: (context: CommandContext) => boolean; // Custom visibility logic
};

export type CommandItem = {
	id: string;
	label: string;
	icon: any;
	shortcut?: string;
	action: () => void | Promise<void>;
	keywords?: string[];
	category: CommandCategory;
	disabled?: boolean;
	badge?: string;
	closeOnExecute?: boolean;
	visibility?: CommandVisibility;
	priority?: number; // Lower number = higher priority in list
};

export type CommandContext = {
	pathname: string;
	params: Record<string, string>;
	searchParams: URLSearchParams;
	isAuthenticated: boolean;
	activeOrganization?: { id: string; slug?: string | null } | null;
	organizations?: Array<{
		id: string;
		name: string;
		slug?: string | null;
		logo?: string | null;
		metadata?: Record<string, unknown> | null;
	}>;
	isMac?: boolean;
};

// Helper functions for common patterns
function isOnRoute(pathname: string, route: string): boolean {
	// Handle organization routes
	if (route.includes('[organization_slug]') && pathname.includes('/organization/')) {
		const routeWithoutOrg = route.replace('/[organization_slug]', '');
		const pathWithoutOrg = pathname.replace(/\/organization\/[^/]+/, '');
		return pathWithoutOrg === routeWithoutOrg;
	}
	return pathname === route;
}

function matchesRoutePattern(pathname: string, pattern: RegExp): boolean {
	return pattern.test(pathname);
}

function checkVisibility(command: CommandItem, context: CommandContext): boolean {
	if (!command.visibility) return true;

	const vis = command.visibility;

	// Check authentication requirement
	if (vis.requiresAuth !== undefined && vis.requiresAuth !== context.isAuthenticated) {
		return false;
	}

	// Check organization requirement
	if (vis.requiresOrg && !context.activeOrganization) {
		return false;
	}

	// Check exact routes
	if (vis.routes && vis.routes.length > 0) {
		const matchesRoute = vis.routes.some((route) => isOnRoute(context.pathname, route));
		if (!matchesRoute) return false;
	}

	// Check excluded routes
	if (vis.excludeRoutes && vis.excludeRoutes.length > 0) {
		const isExcluded = vis.excludeRoutes.some((route) => isOnRoute(context.pathname, route));
		if (isExcluded) return false;
	}

	// Check route patterns
	if (vis.routePatterns && vis.routePatterns.length > 0) {
		const matchesPattern = vis.routePatterns.some((pattern) =>
			matchesRoutePattern(context.pathname, pattern)
		);
		if (!matchesPattern) return false;
	}

	// Check custom logic
	if (vis.custom && !vis.custom(context)) {
		return false;
	}

	return true;
}

// Command definitions
export function getNavigationCommands(context: CommandContext): CommandItem[] {
	const modKey = context.isMac ? '⌘' : 'Ctrl+';

	return [
		{
			id: 'nav-dashboard',
			label: 'Dashboard',
			icon: LayoutDashboard,
			shortcut: `${modKey}D`,
			action: () => navigateToInActiveOrg('dashboard'),
			keywords: ['home', 'overview', 'stats', 'analytics'],
			category: 'navigation',
			priority: 1
		},
		{
			id: 'nav-todos',
			label: "ToDo's",
			icon: ListDetailsIcon,
			shortcut: `${modKey}T`,
			action: () => navigateToInActiveOrg('/todos'),
			keywords: ['tasks', 'list', 'items', 'todo'],
			category: 'navigation',
			priority: 2
		},
		{
			id: 'nav-account',
			label: 'Account',
			icon: User,
			shortcut: `${modKey}U`,
			action: () => navigateToInActiveOrg('/account'),
			keywords: ['profile', 'settings', 'user', 'preferences'],
			category: 'navigation',
			priority: 3
		},
		{
			id: 'nav-organization',
			label: 'Organization',
			icon: Building,
			action: () => navigateToInActiveOrg('/organization/settings'),
			keywords: ['company', 'team', 'workspace'],
			category: 'navigation',
			priority: 4,
			visibility: {
				requiresOrg: true
			}
		}
	];
}

export function getQuickActions(context: CommandContext): CommandItem[] {
	const modKey = context.isMac ? '⌘' : 'Ctrl+';

	return [
		{
			id: 'action-refresh',
			label: 'Refresh Page',
			icon: RefreshCw,
			shortcut: `${modKey}R`,
			action: () => window.location.reload(),
			keywords: ['reload', 'update', 'refresh'],
			category: 'action',
			priority: 10
		},
		{
			id: 'action-change-organization',
			label: 'Change Organization',
			icon: Building,
			action: () => {
				// This will be handled by the component to switch palette mode
				return Promise.resolve();
			},
			keywords: ['switch', 'organization', 'team', 'workspace'],
			category: 'action',
			closeOnExecute: false,
			priority: 11,
			visibility: {
				requiresAuth: true,
				custom: (ctx) => (ctx.organizations?.length ?? 0) > 1
			}
		},
		{
			id: 'action-shortcuts',
			label: 'Keyboard Shortcuts',
			icon: Keyboard,
			shortcut: '?',
			action: () => {
				// This will be handled by the component
				return Promise.resolve();
			},
			keywords: ['help', 'hotkeys', 'keys'],
			category: 'action',
			priority: 12
		},
		{
			id: 'action-signout',
			label: 'Sign Out',
			icon: LogOut,
			action: async () => {
				try {
					const response = await fetch('/api/auth/sign-out', { method: 'POST' });
					if (response.ok) {
						goto('/sign-in');
					}
				} catch (error) {
					console.error('Failed to sign out:', error);
				}
			},
			keywords: ['logout', 'exit', 'leave'],
			category: 'action',
			priority: 20,
			visibility: {
				requiresAuth: true
			}
		}
	];
}

export function getTodoPageCommands(context: CommandContext): CommandItem[] {
	const isOnTodoPage = isOnRoute(context.pathname, '/[organization_slug]/todos');
	if (!isOnTodoPage) return [];

	return [
		{
			id: 'todo-create',
			label: 'Create New Todo',
			icon: Plus,
			shortcut: 'C',
			action: () => {
				// Trigger create todo modal
				const event = new CustomEvent('command:createTodo');
				window.dispatchEvent(event);
			},
			keywords: ['new', 'add', 'create', 'todo', 'task'],
			category: 'page-specific',
			priority: 1,
			visibility: {
				routes: ['/[organization_slug]/todos']
			}
		},
		{
			id: 'todo-filter-active',
			label: 'Show Active Todos',
			icon: ListCheck,
			action: () => {
				const url = new URL(window.location.href);
				url.searchParams.set('status', 'active');
				window.history.pushState({}, '', url);
				window.dispatchEvent(new Event('popstate'));
			},
			keywords: ['filter', 'active', 'pending', 'incomplete'],
			category: 'page-specific',
			priority: 2,
			visibility: {
				routes: ['/[organization_slug]/todos']
			}
		},
		{
			id: 'todo-filter-completed',
			label: 'Show Completed Todos',
			icon: CheckSquare,
			action: () => {
				const url = new URL(window.location.href);
				url.searchParams.set('status', 'completed');
				window.history.pushState({}, '', url);
				window.dispatchEvent(new Event('popstate'));
			},
			keywords: ['filter', 'completed', 'done', 'finished'],
			category: 'page-specific',
			priority: 3,
			visibility: {
				routes: ['/[organization_slug]/todos']
			}
		},
		{
			id: 'todo-filter-all',
			label: 'Show All Todos',
			icon: ListDetailsIcon,
			action: () => {
				const url = new URL(window.location.href);
				url.searchParams.delete('status');
				window.history.pushState({}, '', url);
				window.dispatchEvent(new Event('popstate'));
			},
			keywords: ['filter', 'all', 'clear', 'reset'],
			category: 'page-specific',
			priority: 4,
			visibility: {
				routes: ['/[organization_slug]/todos']
			}
		},
		{
			id: 'todo-clear-completed',
			label: 'Clear Completed Todos',
			icon: Archive,
			action: () => {
				const event = new CustomEvent('command:clearCompleted');
				window.dispatchEvent(event);
			},
			keywords: ['clear', 'delete', 'remove', 'completed'],
			category: 'page-specific',
			priority: 5,
			visibility: {
				routes: ['/[organization_slug]/todos']
			}
		},
		{
			id: 'todo-sort-date',
			label: 'Sort by Date',
			icon: Calendar,
			action: () => {
				const url = new URL(window.location.href);
				url.searchParams.set('sort', 'date');
				window.history.pushState({}, '', url);
				window.dispatchEvent(new Event('popstate'));
			},
			keywords: ['sort', 'order', 'date', 'created'],
			category: 'page-specific',
			priority: 6,
			visibility: {
				routes: ['/[organization_slug]/todos']
			}
		},
		{
			id: 'todo-sort-priority',
			label: 'Sort by Priority',
			icon: TrendingUp,
			action: () => {
				const url = new URL(window.location.href);
				url.searchParams.set('sort', 'priority');
				window.history.pushState({}, '', url);
				window.dispatchEvent(new Event('popstate'));
			},
			keywords: ['sort', 'order', 'priority', 'importance'],
			category: 'page-specific',
			priority: 7,
			visibility: {
				routes: ['/[organization_slug]/todos']
			}
		},
		{
			id: 'todo-export',
			label: 'Export Todos',
			icon: Download,
			action: () => {
				const event = new CustomEvent('command:exportTodos');
				window.dispatchEvent(event);
			},
			keywords: ['export', 'download', 'save', 'csv', 'json'],
			category: 'page-specific',
			priority: 8,
			visibility: {
				routes: ['/[organization_slug]/todos']
			}
		}
	];
}

export function getDashboardCommands(context: CommandContext): CommandItem[] {
	const isOnDashboard = isOnRoute(context.pathname, '/[organization_slug]/dashboard');
	if (!isOnDashboard) return [];

	return [
		{
			id: 'dashboard-date-today',
			label: 'Set Date Range to Today',
			icon: Calendar,
			action: () => {
				const today = new Date().toISOString().split('T')[0];
				const url = new URL(window.location.href);
				url.searchParams.set('startDate', today);
				url.searchParams.set('endDate', today);
				window.history.pushState({}, '', url);
				window.dispatchEvent(new Event('popstate'));
			},
			keywords: ['date', 'today', 'filter', 'time'],
			category: 'page-specific',
			priority: 1,
			visibility: {
				routes: ['/[organization_slug]/dashboard']
			}
		},
		{
			id: 'dashboard-date-week',
			label: 'Set Date Range to This Week',
			icon: Calendar,
			action: () => {
				const today = new Date();
				const startOfWeek = new Date(today);
				startOfWeek.setDate(today.getDate() - today.getDay());
				const endOfWeek = new Date(startOfWeek);
				endOfWeek.setDate(startOfWeek.getDate() + 6);

				const url = new URL(window.location.href);
				url.searchParams.set('startDate', startOfWeek.toISOString().split('T')[0]);
				url.searchParams.set('endDate', endOfWeek.toISOString().split('T')[0]);
				window.history.pushState({}, '', url);
				window.dispatchEvent(new Event('popstate'));
			},
			keywords: ['date', 'week', 'filter', 'time'],
			category: 'page-specific',
			priority: 2,
			visibility: {
				routes: ['/[organization_slug]/dashboard']
			}
		},
		{
			id: 'dashboard-date-month',
			label: 'Set Date Range to This Month',
			icon: Calendar,
			action: () => {
				const today = new Date();
				const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
				const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

				const url = new URL(window.location.href);
				url.searchParams.set('startDate', startOfMonth.toISOString().split('T')[0]);
				url.searchParams.set('endDate', endOfMonth.toISOString().split('T')[0]);
				window.history.pushState({}, '', url);
				window.dispatchEvent(new Event('popstate'));
			},
			keywords: ['date', 'month', 'filter', 'time'],
			category: 'page-specific',
			priority: 3,
			visibility: {
				routes: ['/[organization_slug]/dashboard']
			}
		},
		{
			id: 'dashboard-export',
			label: 'Export Dashboard Data',
			icon: Download,
			action: () => {
				const event = new CustomEvent('command:exportDashboard');
				window.dispatchEvent(event);
			},
			keywords: ['export', 'download', 'save', 'analytics'],
			category: 'page-specific',
			priority: 4,
			visibility: {
				routes: ['/[organization_slug]/dashboard']
			}
		}
	];
}

export function getOrganizationCommands(context: CommandContext): CommandItem[] {
	if (!context.organizations || context.organizations.length === 0) return [];

	const fallbackOrgIcons = [GalleryVerticalEndIcon, AudioWaveformIcon, CommandIcon];

	return context.organizations.flatMap((org, index) => {
		if (!org.slug) return [];
		const isActive = context.activeOrganization?.id === org.id;
		const Icon = fallbackOrgIcons[index % fallbackOrgIcons.length] ?? Building;

		return [
			{
				id: `org-${org.id}`,
				label: org.name,
				icon: Icon,
				action: () => changeActiveOrg(org.slug!),
				keywords: [org.slug, org.name],
				category: 'organization',
				badge: isActive ? 'Active' : undefined,
				disabled: isActive,
				priority: index
			}
		];
	});
}

export function getOrganizationSettingsCommands(context: CommandContext): CommandItem[] {
	const isOnOrgSettings = matchesRoutePattern(
		context.pathname,
		/\/organization\/[^/]+\/organization/
	);
	if (!isOnOrgSettings) return [];

	return [
		{
			id: 'org-invite-member',
			label: 'Invite Team Member',
			icon: Users,
			action: () => {
				const event = new CustomEvent('command:inviteMember');
				window.dispatchEvent(event);
			},
			keywords: ['invite', 'add', 'member', 'user', 'team'],
			category: 'page-specific',
			priority: 1,
			visibility: {
				routePatterns: [/\/organization\/[^/]+\/organization/]
			}
		},
		{
			id: 'org-settings',
			label: 'Organization Settings',
			icon: Settings,
			action: () => navigateToInActiveOrg('/organization/settings'),
			keywords: ['settings', 'config', 'preferences'],
			category: 'page-specific',
			priority: 2,
			visibility: {
				routePatterns: [/\/organization\/[^/]+\/organization/]
			}
		},
		{
			id: 'org-billing',
			label: 'Manage Billing',
			icon: CreditCard,
			action: () => navigateToInActiveOrg('/organization/billing'),
			keywords: ['billing', 'payment', 'subscription', 'invoice'],
			category: 'page-specific',
			priority: 3,
			visibility: {
				routePatterns: [/\/organization\/[^/]+\/organization/]
			}
		}
	];
}

// Main functions to get commands
export function getAllCommands(context: CommandContext): CommandItem[] {
	const commands = [
		...getNavigationCommands(context),
		...getQuickActions(context),
		...getTodoPageCommands(context),
		...getDashboardCommands(context),
		...getOrganizationCommands(context),
		...getOrganizationSettingsCommands(context)
	];

	// Sort by priority and category
	return commands.sort((a, b) => {
		// First sort by category priority
		const categoryOrder = ['navigation', 'page-specific', 'action', 'organization', 'filter'];
		const aCategoryIndex = categoryOrder.indexOf(a.category);
		const bCategoryIndex = categoryOrder.indexOf(b.category);

		if (aCategoryIndex !== bCategoryIndex) {
			return aCategoryIndex - bCategoryIndex;
		}

		// Then sort by priority within category
		return (a.priority ?? 999) - (b.priority ?? 999);
	});
}

export function getVisibleCommands(context: CommandContext): CommandItem[] {
	const allCommands = getAllCommands(context);
	return allCommands.filter((command) => checkVisibility(command, context));
}

export function getCommandsByCategory(
	category: CommandCategory,
	context: CommandContext
): CommandItem[] {
	const visibleCommands = getVisibleCommands(context);
	return visibleCommands.filter((cmd) => cmd.category === category);
}

// Special function for organization switching mode
export function getOrganizationSwitchCommands(context: CommandContext): CommandItem[] {
	return [
		...getOrganizationCommands(context),
		{
			id: 'back-to-commands',
			label: 'Back to all commands',
			icon: ArrowLeft,
			action: () => {
				// This will be handled by the component
				return Promise.resolve();
			},
			keywords: ['back', 'return'],
			category: 'action',
			priority: 999
		}
	];
}

