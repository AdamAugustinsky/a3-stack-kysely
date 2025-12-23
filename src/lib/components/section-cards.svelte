<script lang="ts">
	import TrendingDownIcon from '@tabler/icons-svelte/icons/trending-down';
	import TrendingUpIcon from '@tabler/icons-svelte/icons/trending-up';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { getDashboardStats } from '$lib/remote/dashboard.remote';

	const statsQuery = getDashboardStats();
</script>

{#if statsQuery.error}
	<div class="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
		<Card.Root class="@container/card gap-4 py-4 shadow-xs">
			<Card.Header class="px-5">
				<Card.Description class="text-xs">Stats</Card.Description>
				<Card.Title class="text-xl font-semibold tabular-nums">--</Card.Title>
				<Card.Action>
					<Badge variant="destructive">Error</Badge>
				</Card.Action>
			</Card.Header>
			<Card.Content class="px-5">
				<p class="text-sm font-medium">Failed to load statistics</p>
				<p class="text-sm text-muted-foreground">Refresh to try again.</p>
			</Card.Content>
		</Card.Root>
	</div>
{:else if statsQuery.loading}
	<div class="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
		{#each Array.from({ length: 4 }, (_, i) => i) as i (i)}
			<Card.Root class="@container/card gap-4 py-4 shadow-xs">
				<Card.Header class="px-5">
					<Card.Description class="text-xs">Loading</Card.Description>
					<Card.Title class="text-xl font-semibold tabular-nums">--</Card.Title>
				</Card.Header>
				<Card.Content class="px-5">
					<div class="h-4 w-24 animate-pulse rounded bg-muted"></div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
{:else}
	<div class="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
		<Card.Root class="@container/card relative gap-4 py-4 shadow-xs">
			<div class="absolute left-5 right-5 top-0 h-px rounded-full bg-sky-500/35"></div>
			<Card.Header class="px-5">
				<Card.Description class="text-xs">Total tasks</Card.Description>
				<Card.Title class="text-2xl font-semibold tabular-nums">
					{statsQuery.current?.totalTodos ?? 0}
				</Card.Title>
				<Card.Action>
					<Badge variant="outline">
						<TrendingUpIcon />
						Active
					</Badge>
				</Card.Action>
			</Card.Header>
			<Card.Content class="px-5">
				<p class="text-sm text-muted-foreground">All tasks in this workspace.</p>
			</Card.Content>
		</Card.Root>

		<Card.Root class="@container/card relative gap-4 py-4 shadow-xs">
			<div class="absolute left-5 right-5 top-0 h-px rounded-full bg-emerald-500/35"></div>
			<Card.Header class="px-5">
				<Card.Description class="text-xs">Completed</Card.Description>
				<Card.Title class="text-2xl font-semibold tabular-nums">
					{statsQuery.current?.completedTodos ?? 0}
				</Card.Title>
				<Card.Action>
					<Badge variant="outline">
						<TrendingUpIcon />
						{statsQuery.current?.completionRate ?? 0}%
					</Badge>
				</Card.Action>
			</Card.Header>
			<Card.Content class="px-5">
				<p class="text-sm text-muted-foreground">Tasks marked as done.</p>
			</Card.Content>
		</Card.Root>

		<Card.Root class="@container/card relative gap-4 py-4 shadow-xs">
			<div class="absolute left-5 right-5 top-0 h-px rounded-full bg-violet-500/35"></div>
			<Card.Header class="px-5">
				<Card.Description class="text-xs">In progress</Card.Description>
				<Card.Title class="text-2xl font-semibold tabular-nums">
					{statsQuery.current?.inProgressTodos ?? 0}
				</Card.Title>
				<Card.Action>
					<Badge variant="outline">
						<TrendingUpIcon />
						Active
					</Badge>
				</Card.Action>
			</Card.Header>
			<Card.Content class="px-5">
				<p class="text-sm text-muted-foreground">Currently being worked on.</p>
			</Card.Content>
		</Card.Root>

		<Card.Root class="@container/card relative gap-4 py-4 shadow-xs">
			<div class="absolute left-5 right-5 top-0 h-px rounded-full bg-amber-500/40"></div>
			<Card.Header class="px-5">
				<Card.Description class="text-xs">High priority</Card.Description>
				<Card.Title class="text-2xl font-semibold tabular-nums">
					{statsQuery.current?.highPriorityTodos ?? 0}
				</Card.Title>
				<Card.Action>
					<Badge variant="outline">
						{#if (statsQuery.current?.highPriorityTodos ?? 0) > 5}
							<TrendingUpIcon />
							Urgent
						{:else}
							<TrendingDownIcon />
							Manageable
						{/if}
					</Badge>
				</Card.Action>
			</Card.Header>
			<Card.Content class="px-5">
				<p class="text-sm text-muted-foreground">High priority tasks pending.</p>
			</Card.Content>
		</Card.Root>
	</div>
{/if}
