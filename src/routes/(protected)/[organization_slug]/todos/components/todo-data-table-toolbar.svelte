<script lang="ts" generics="TData">
	import XIcon from '@lucide/svelte/icons/x';
	import type { Table } from '@tanstack/table-core';
	import Button from '$lib/components/ui/button/button.svelte';
	import TodoDataTableViewOptions from './todo-data-table-view-options.svelte';
	import TodoDataTableFacetedFilter from './todo-data-table-faceted-filter.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { priorities, statuses, labels } from './data.js';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Kbd from '$lib/components/kbd.svelte';
	import type { FilterStore } from '$lib/components/filter/filter-store.svelte';
	import type { FilterConfig } from '@/utils/filter';
	import FilterBuilder from '$lib/components/filter/filter-builder.svelte';
	import FilterBreadcrumbs from '$lib/components/filter/filter-breadcrumbs.svelte';
	import SettingsIcon from '@lucide/svelte/icons/settings';

	let {
		table,
		filterStore,
		todoFilterConfig
	}: {
		table: Table<TData>;
		filterStore: FilterStore;
		todoFilterConfig: FilterConfig[];
	} = $props();

	const isFiltered = $derived(table.getState().columnFilters.length > 0 || filterStore.hasAnyFilters);
	const statusCol = $derived(table.getColumn('status'));
	const priorityCol = $derived(table.getColumn('priority'));
	const labelCol = $derived(table.getColumn('label'));

	// Check if we should show simple or advanced filters
	const showAdvancedFilters = $derived(filterStore.currentMode === 'advanced');

	// Ref to the text filter input for focusing with '/'
	let filterRef = $state<HTMLInputElement | null>(null);
	let inputFocused = $state(false);

	onMount(() => {
		function shouldIgnoreTarget(target: EventTarget | null): boolean {
			const el = target as HTMLElement | null;
			if (!el) return false;
			const tag = el.tagName?.toLowerCase();
			return el.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select';
		}

		function handleKeydown(event: KeyboardEvent) {
			if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
				if (shouldIgnoreTarget(event.target)) return;
				event.preventDefault();
				filterRef?.focus();
			}
		}

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});

	function submitFilters() {
		// Build URL from current filters in the table state
		const url = new URL(page.url);
		url.searchParams.delete('status');
		url.searchParams.delete('priority');
		url.searchParams.delete('search');
		url.searchParams.delete('label');

		for (const filter of table.getState().columnFilters) {
			if (filter.id === 'status' && Array.isArray(filter.value) && filter.value.length > 0) {
				for (const status of filter.value) url.searchParams.append('status', status);
			} else if (
				filter.id === 'priority' &&
				Array.isArray(filter.value) &&
				filter.value.length > 0
			) {
				for (const priority of filter.value) url.searchParams.append('priority', priority);
			} else if (filter.id === 'label' && Array.isArray(filter.value) && filter.value.length > 0) {
				for (const label of filter.value) url.searchParams.append('label', label);
			} else if (filter.id === 'text' && filter.value) {
				url.searchParams.set('search', String(filter.value));
			}
		}

		filterRef?.blur();
		goto(url.toString(), { replaceState: true, keepFocus: false, noScroll: true });
	}
</script>

<div class="space-y-3">
	<!-- Filter Mode Toggle -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<span class="text-sm text-muted-foreground">Filters:</span>
			<Button
				variant={showAdvancedFilters ? 'ghost' : 'secondary'}
				size="sm"
				class="h-7 text-xs"
				onclick={() => filterStore.switchMode('simple')}
			>
				Simple
			</Button>
			<Button
				variant={showAdvancedFilters ? 'secondary' : 'ghost'}
				size="sm"
				class="h-7 text-xs"
				onclick={() => filterStore.switchMode('advanced')}
			>
				<SettingsIcon class="h-3 w-3 mr-1" />
				Advanced
			</Button>
		</div>
		<TodoDataTableViewOptions {table} />
	</div>

	{#if showAdvancedFilters}
		<!-- Advanced Filters UI -->
		<div class="space-y-3">
			<div class="flex items-center gap-2">
				<FilterBuilder config={todoFilterConfig} store={filterStore} placeholder="Add filter" />
				{#if filterStore.hasAdvancedFilters}
					<Button
						variant="ghost"
						size="sm"
						class="h-7 px-2 text-xs"
						onclick={() => filterStore.clearFilters()}
					>
						Clear all
						<XIcon class="h-3 w-3 ml-1" />
					</Button>
				{/if}
			</div>
			{#if filterStore.hasAdvancedFilters}
				<FilterBreadcrumbs store={filterStore} config={todoFilterConfig} />
			{/if}
		</div>
	{:else}
		<!-- Simple Filters UI (existing) -->
		<div class="flex items-center space-x-2">
			<div class="relative">
				<Input
					bind:ref={filterRef}
					placeholder="Filter tasks..."
					aria-keyshortcuts="/"
					title="Press / to focus"
					value={(table.getColumn('text')?.getFilterValue() as string) ?? ''}
					onfocus={() => (inputFocused = true)}
					onblur={() => (inputFocused = false)}
					oninput={(e) => {
						table.getColumn('text')?.setFilterValue(e.currentTarget.value);
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
							e.preventDefault();
							submitFilters();
						}
					}}
					onchange={(e) => {
						table.getColumn('text')?.setFilterValue(e.currentTarget.value);
					}}
					class="h-8 w-[150px] pr-8 lg:w-[250px]"
				/>
				{#if !inputFocused && !((table.getColumn('text')?.getFilterValue() as string) ?? '').length}
					<Kbd content="/" class="absolute top-1/2 right-1.5 -translate-y-1/2" aria-hidden="true" />
				{/if}
			</div>

			{#if statusCol}
				<TodoDataTableFacetedFilter column={statusCol} title="Status" options={statuses} />
			{/if}
			{#if priorityCol}
				<TodoDataTableFacetedFilter column={priorityCol} title="Priority" options={priorities} />
			{/if}
			{#if labelCol}
				<TodoDataTableFacetedFilter column={labelCol} title="Label" options={labels} />
			{/if}

			{#if isFiltered}
				<Button
					variant="ghost"
					onclick={() => {
						table.resetColumnFilters();
						filterStore.clearFilters();
					}}
					class="h-8 px-2 lg:px-3"
				>
					Reset
					<XIcon />
				</Button>
			{/if}
		</div>
	{/if}
</div>
