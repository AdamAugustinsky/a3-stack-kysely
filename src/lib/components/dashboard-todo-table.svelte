<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { getTodos } from '@routes/(protected)/[organization_slug]/todos/todo.remote.js';
	import {
		labels,
		statuses,
		priorities
	} from '@routes/(protected)/[organization_slug]/todos/components/data';
	import { ExternalLinkIcon } from '@lucide/svelte';
	import { page } from '$app/state';

	const todosQuery = getTodos([]);

	function getStatusInfo(status: string) {
		return statuses.find((s) => s.value === status) || statuses[0];
	}

	function getPriorityInfo(priority: string) {
		return priorities.find((p) => p.value === priority) || priorities[0];
	}

	function getLabelInfo(label: string) {
		return labels.find((l) => l.value === label) || labels[0];
	}

	function getPriorityColor(priority: string) {
		switch (priority) {
			case 'high':
				return 'destructive';
			case 'medium':
				return 'secondary';
			case 'low':
				return 'outline';
			default:
				return 'outline';
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'done':
				return 'default';
			case 'in progress':
				return 'secondary';
			case 'todo':
				return 'outline';
			case 'backlog':
				return 'outline';
			case 'canceled':
				return 'destructive';
			default:
				return 'outline';
		}
	}
</script>

<Card.Root>
	<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
		<div class="space-y-1">
			<Card.Title class="text-lg font-semibold">Recent Tasks</Card.Title>
			<Card.Description>Latest tasks and their current status</Card.Description>
		</div>
		<Button variant="outline" size="sm" href={'/' + page.params.organization_slug + '/todos'}>
			View All
			<ExternalLinkIcon class="ml-2 h-4 w-4" />
		</Button>
	</Card.Header>
	<Card.Content>
		{#if todosQuery.loading}
			<div class="space-y-3">
				{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
					<div class="flex items-center space-x-4 rounded-lg border p-3">
						<div class="h-4 w-4 animate-pulse rounded bg-muted"></div>
						<div class="flex-1 space-y-2">
							<div class="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
							<div class="h-3 w-1/2 animate-pulse rounded bg-muted"></div>
						</div>
						<div class="h-6 w-16 animate-pulse rounded bg-muted"></div>
					</div>
				{/each}
			</div>
		{:else if todosQuery.error}
			<div class="py-6 text-center">
				<div
					class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10"
				>
					<ExternalLinkIcon class="h-6 w-6 text-destructive" />
				</div>
				<h3 class="mt-2 text-sm font-semibold text-destructive">Failed to load tasks</h3>
				<p class="mt-1 text-sm text-muted-foreground">There was an error loading your tasks.</p>
				<div class="mt-4">
					<Button variant="outline" size="sm" onclick={() => window.location.reload()}>
						Try Again
					</Button>
				</div>
			</div>
		{:else if todosQuery.current && todosQuery.current.length > 0}
			<div class="space-y-3">
				{#each todosQuery.current.slice(0, 8) as todo (todo.id)}
					{@const statusInfo = getStatusInfo(todo.status)}
					{@const priorityInfo = getPriorityInfo(todo.priority)}
					{@const labelInfo = getLabelInfo(todo.label)}
					<div
						class="flex items-center space-x-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
					>
						<div class="flex h-4 w-4 items-center justify-center">
							<statusInfo.icon class="h-4 w-4 text-muted-foreground" />
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<Badge variant="outline" class="text-xs">
									{labelInfo.label}
								</Badge>
								<Badge variant={getPriorityColor(todo.priority)} class="text-xs">
									<priorityInfo.icon class="mr-1 h-3 w-3" />
									{priorityInfo.label}
								</Badge>
							</div>
							<p class="mt-1 truncate text-sm leading-none font-medium">
								{todo.text}
							</p>
						</div>
						<div class="flex items-center">
							<Badge variant={getStatusColor(todo.status)} class="text-xs">
								{statusInfo.label}
							</Badge>
						</div>
					</div>
				{/each}
			</div>

			{#if todosQuery.current.length > 8}
				<div class="mt-4 text-center">
					<Button variant="ghost" size="sm" href={'/' + page.params.organization_slug + '/todos'}>
						View {todosQuery.current.length - 8} more tasks
					</Button>
				</div>
			{/if}
		{:else}
			<div class="py-6 text-center">
				<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
					<ExternalLinkIcon class="h-6 w-6 text-muted-foreground" />
				</div>
				<h3 class="mt-2 text-sm font-semibold text-muted-foreground">No tasks yet</h3>
				<p class="mt-1 text-sm text-muted-foreground">Get started by creating your first task.</p>
				<div class="mt-4">
					<Button size="sm" href={'/' + page.params.organization_slug + '/todos'}
						>Create Task</Button
					>
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
