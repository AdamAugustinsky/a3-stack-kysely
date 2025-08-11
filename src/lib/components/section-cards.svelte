<script lang="ts">
	import TrendingDownIcon from '@tabler/icons-svelte/icons/trending-down';
	import TrendingUpIcon from '@tabler/icons-svelte/icons/trending-up';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { getDashboardStats } from '@routes/(protected)/[organization_slug]/dashboard/dashboard.remote';

	const statsQuery = getDashboardStats();
</script>

{#if statsQuery.error}
	<div
		class="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"
	>
		<Card.Root class="@container/card">
			<Card.Header>
				<Card.Description>Error</Card.Description>
				<Card.Title class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
					--
				</Card.Title>
				<Card.Action>
					<Badge variant="destructive">Error</Badge>
				</Card.Action>
			</Card.Header>
			<Card.Footer class="flex-col items-start gap-1.5 text-sm">
				<div class="line-clamp-1 flex gap-2 font-medium">Failed to load statistics</div>
				<div class="text-muted-foreground">Please try refreshing the page</div>
			</Card.Footer>
		</Card.Root>
	</div>
{:else if statsQuery.loading}
	<div
		class="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"
	>
		{#each Array.from({ length: 4 }, (_, i) => i) as i (i)}
			<Card.Root class="@container/card">
				<Card.Header>
					<Card.Description>Loading...</Card.Description>
					<Card.Title class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
						--
					</Card.Title>
				</Card.Header>
				<Card.Footer class="flex-col items-start gap-1.5 text-sm">
					<div class="line-clamp-1 flex gap-2 font-medium">Loading statistics...</div>
					<div class="text-muted-foreground">Please wait</div>
				</Card.Footer>
			</Card.Root>
		{/each}
	</div>
{:else}
	<div
		class="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card"
	>
		<Card.Root class="@container/card">
			<Card.Header>
				<Card.Description>Total Tasks</Card.Description>
				<Card.Title class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
					{statsQuery.current?.totalTodos ?? 0}
				</Card.Title>
				<Card.Action>
					<Badge variant="outline">
						<TrendingUpIcon />
						Active
					</Badge>
				</Card.Action>
			</Card.Header>
			<Card.Footer class="flex-col items-start gap-1.5 text-sm">
				<div class="line-clamp-1 flex gap-2 font-medium">
					All tasks in your workspace <TrendingUpIcon class="size-4" />
				</div>
				<div class="text-muted-foreground">Total number of tasks created</div>
			</Card.Footer>
		</Card.Root>

		<Card.Root class="@container/card">
			<Card.Header>
				<Card.Description>Completed Tasks</Card.Description>
				<Card.Title class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
					{statsQuery.current?.completedTodos ?? 0}
				</Card.Title>
				<Card.Action>
					<Badge variant="outline">
						<TrendingUpIcon />
						{statsQuery.current?.completionRate ?? 0}%
					</Badge>
				</Card.Action>
			</Card.Header>
			<Card.Footer class="flex-col items-start gap-1.5 text-sm">
				<div class="line-clamp-1 flex gap-2 font-medium">
					{statsQuery.current?.completionRate ?? 0}% completion rate <TrendingUpIcon
						class="size-4"
					/>
				</div>
				<div class="text-muted-foreground">Tasks marked as done</div>
			</Card.Footer>
		</Card.Root>

		<Card.Root class="@container/card">
			<Card.Header>
				<Card.Description>In Progress</Card.Description>
				<Card.Title class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
					{statsQuery.current?.inProgressTodos ?? 0}
				</Card.Title>
				<Card.Action>
					<Badge variant="outline">
						<TrendingUpIcon />
						Active
					</Badge>
				</Card.Action>
			</Card.Header>
			<Card.Footer class="flex-col items-start gap-1.5 text-sm">
				<div class="line-clamp-1 flex gap-2 font-medium">
					Currently being worked on <TrendingUpIcon class="size-4" />
				</div>
				<div class="text-muted-foreground">Tasks in active development</div>
			</Card.Footer>
		</Card.Root>

		<Card.Root class="@container/card">
			<Card.Header>
				<Card.Description>High Priority</Card.Description>
				<Card.Title class="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
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
			<Card.Footer class="flex-col items-start gap-1.5 text-sm">
				<div class="line-clamp-1 flex gap-2 font-medium">
					{#if (statsQuery.current?.highPriorityTodos ?? 0) > 5}
						High priority backlog needs attention <TrendingUpIcon class="size-4" />
					{:else}
						Priority level is manageable <TrendingDownIcon class="size-4" />
					{/if}
				</div>
				<div class="text-muted-foreground">High priority tasks pending</div>
			</Card.Footer>
		</Card.Root>
	</div>
{/if}
