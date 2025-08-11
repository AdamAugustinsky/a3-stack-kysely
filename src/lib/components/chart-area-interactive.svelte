<script lang="ts">
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { scaleUtc } from 'd3-scale';
	import { Area, AreaChart } from 'layerchart';
	import { curveNatural } from 'd3-shape';
	import { getRecentActivity } from '@routes/(protected)/[organization_slug]/dashboard/dashboard.remote';

	type RangeKey = '30d' | '14d' | '7d';

	const activityQuery = getRecentActivity();

	let timeRange = $state<RangeKey>('30d');

	const LABEL: Record<RangeKey, string> = {
		'30d': 'Last 30 days',
		'14d': 'Last 14 days',
		'7d': 'Last 7 days'
	};

	const RANGE_TO_DAYS: Record<RangeKey, number> = {
		'30d': 30,
		'14d': 14,
		'7d': 7
	};

	const selectedLabel = $derived.by(() => LABEL[timeRange]);

	const filteredData = $derived.by(() => {
		if (activityQuery.loading || activityQuery.error || !activityQuery.current) return [];
		const daysToShow = RANGE_TO_DAYS[timeRange];

		// Normalize data defensively to avoid NaNs and ensure Date instances
		return activityQuery.current.slice(-daysToShow).map((d) => ({
			date: d.date instanceof Date ? d.date : new Date(d.date),
			completed: +d.completed || 0,
			inProgress: +d.inProgress || 0,
			total: +d.total || 0
		}));
	});

	const chartConfig = {
		completed: { label: 'Completed', color: 'var(--primary)' },
		inProgress: { label: 'In Progress', color: 'var(--primary)' }
	} satisfies Chart.ChartConfig;
</script>

<Card.Root class="@container/card">
	<Card.Header>
		<Card.Title>Task Activity</Card.Title>
		<Card.Description>
			<span class="hidden @[540px]/card:block">Task completion trends over time</span>
			<span class="@[540px]/card:hidden">Task trends</span>
		</Card.Description>
		<Card.Action>
			<ToggleGroup.Root
				type="single"
				bind:value={timeRange}
				variant="outline"
				class="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
			>
				<ToggleGroup.Item value="30d">Last 30 days</ToggleGroup.Item>
				<ToggleGroup.Item value="14d">Last 14 days</ToggleGroup.Item>
				<ToggleGroup.Item value="7d">Last 7 days</ToggleGroup.Item>
			</ToggleGroup.Root>
			<Select.Root type="single" bind:value={timeRange}>
				<Select.Trigger
					size="sm"
					class="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
					aria-label="Select a value"
				>
					<span data-slot="select-value">
						{selectedLabel}
					</span>
				</Select.Trigger>
				<Select.Content class="rounded-xl">
					<Select.Item value="30d" class="rounded-lg">Last 30 days</Select.Item>
					<Select.Item value="14d" class="rounded-lg">Last 14 days</Select.Item>
					<Select.Item value="7d" class="rounded-lg">Last 7 days</Select.Item>
				</Select.Content>
			</Select.Root>
		</Card.Action>
	</Card.Header>
	<Card.Content class="px-2 pt-4 sm:px-6 sm:pt-6">
		{#if activityQuery.loading}
			<div class="flex aspect-auto h-[250px] w-full items-center justify-center">
				<div class="text-center">
					<div class="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
					<p class="mt-2 text-sm text-muted-foreground">Loading chart data...</p>
				</div>
			</div>
		{:else if activityQuery.error}
			<div class="flex aspect-auto h-[250px] w-full items-center justify-center">
				<div class="text-center">
					<p class="text-sm text-destructive">Failed to load chart data</p>
					<p class="mt-1 text-xs text-muted-foreground">Please try refreshing the page</p>
				</div>
			</div>
		{:else if filteredData.length > 0}
			<Chart.Container config={chartConfig} class="aspect-auto h-[250px] w-full">
				<AreaChart
					legend
					data={filteredData}
					x="date"
					xScale={scaleUtc()}
					series={[
						{
							key: 'inProgress',
							label: 'In Progress',
							color: chartConfig.inProgress.color
						},
						{
							key: 'completed',
							label: 'Completed',
							color: chartConfig.completed.color
						}
					]}
					seriesLayout="stack"
					props={{
						area: {
							curve: curveNatural,
							'fill-opacity': 0.4,
							line: { class: 'stroke-1' },
							motion: 'tween'
						},
						xAxis: {
							ticks: timeRange === '7d' ? 7 : undefined,
							format: (v) => {
								return v.toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric'
								});
							}
						},
						yAxis: { format: () => '' }
					}}
				>
					{#snippet marks({ series, getAreaProps })}
						<defs>
							<linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stop-color="var(--color-completed)" stop-opacity={1.0} />
								<stop offset="95%" stop-color="var(--color-completed)" stop-opacity={0.1} />
							</linearGradient>
							<linearGradient id="fillInProgress" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stop-color="var(--color-inProgress)" stop-opacity={0.8} />
								<stop offset="95%" stop-color="var(--color-inProgress)" stop-opacity={0.1} />
							</linearGradient>
						</defs>
						{#each series as s, i (s.key)}
							<Area
								{...getAreaProps(s, i)}
								fill={s.key === 'completed' ? 'url(#fillCompleted)' : 'url(#fillInProgress)'}
							/>
						{/each}
					{/snippet}
					{#snippet tooltip()}
						<Chart.Tooltip
							labelFormatter={(v: Date) => {
								return v.toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric'
								});
							}}
							indicator="line"
						/>
					{/snippet}
				</AreaChart>
			</Chart.Container>
		{:else}
			<div class="flex aspect-auto h-[250px] w-full items-center justify-center">
				<div class="text-center">
					<p class="text-sm text-muted-foreground">No activity data available</p>
					<p class="mt-1 text-xs text-muted-foreground">Start creating tasks to see trends</p>
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
