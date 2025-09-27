/* eslint-disable svelte/no-navigation-without-resolve */
import { goto } from '$app/navigation';
import { page } from '$app/state';
import {
	type Filter,
	generateFilterId,
	serializeFilters,
	deserializeFilters
} from '@/utils/filter';
import { SvelteURL, SvelteURLSearchParams } from 'svelte/reactivity';

type FilterMode = 'simple' | 'advanced';

function getInitialFilters(): Filter[] {
	const filtersParam = page.url.searchParams.get('filters');
	if (filtersParam) {
		try {
			return deserializeFilters(filtersParam);
		} catch (e) {
			console.error('Failed to parse filters from URL:', e);
			return [];
		}
	}
	return [];
}

function convertSimpleFiltersToAdvanced(): Filter[] {
	const url = page.url.searchParams;
	const filters: Filter[] = [];

	// Convert text search
	const search = url.get('search');
	if (search) {
		filters.push({
			id: generateFilterId(),
			field: 'text',
			operator: 'contains',
			value: search,
			type: 'text'
		});
	}

	// Convert status filters
	const statuses = url.getAll('status');
	if (statuses.length > 0) {
		filters.push({
			id: generateFilterId(),
			field: 'status',
			operator: statuses.length === 1 ? 'is' : 'is_any_of',
			value: statuses.length === 1 ? statuses[0] : statuses,
			type: statuses.length === 1 ? 'select' : 'multiselect'
		});
	}

	// Convert priority filters
	const priorities = url.getAll('priority');
	if (priorities.length > 0) {
		filters.push({
			id: generateFilterId(),
			field: 'priority',
			operator: priorities.length === 1 ? 'is' : 'is_any_of',
			value: priorities.length === 1 ? priorities[0] : priorities,
			type: priorities.length === 1 ? 'select' : 'multiselect'
		});
	}

	// Convert label filters
	const labels = url.getAll('label');
	if (labels.length > 0) {
		filters.push({
			id: generateFilterId(),
			field: 'label',
			operator: labels.length === 1 ? 'is' : 'is_any_of',
			value: labels.length === 1 ? labels[0] : labels,
			type: labels.length === 1 ? 'select' : 'multiselect'
		});
	}

	return filters;
}

export class FilterStore {
	filters = $state<Filter[]>(getInitialFilters());
	lastUrlFilters = $state<string>(page.url.searchParams.get('filters') || '');
	mode = $state<FilterMode>('simple');

	constructor(initialFilters: Filter[] = [], initialMode: FilterMode = 'simple') {
		this.filters = initialFilters;
		this.mode = initialMode;

		// Determine initial mode based on URL structure
		const hasAdvancedFilters = page.url.searchParams.has('filters');
		const hasSimpleFilters = page.url.searchParams.has('search') ||
			page.url.searchParams.has('status') ||
			page.url.searchParams.has('priority') ||
			page.url.searchParams.has('label');

		if (hasAdvancedFilters) {
			this.mode = 'advanced';
		} else if (hasSimpleFilters) {
			this.mode = 'simple';
		}

		$effect(() => {
			const currentUrlFilters = page.url.searchParams.get('filters') || '';
			if (currentUrlFilters !== this.lastUrlFilters) {
				this.lastUrlFilters = currentUrlFilters;
				try {
					this.filters = currentUrlFilters ? deserializeFilters(currentUrlFilters) : [];
					if (currentUrlFilters) {
						this.mode = 'advanced';
					}
				} catch (e) {
					console.error('Failed to parse filters from URL:', e);
					this.filters = [];
				}
			}
		});

		$effect(() => {
			if (this.mode === 'advanced') {
				const currentFilterSerialized = this.filters.length > 0 ? serializeFilters(this.filters) : '';

				if (currentFilterSerialized !== this.lastUrlFilters) {
					this.lastUrlFilters = currentFilterSerialized;
					const url = new SvelteURL(window.location.href);

					// Clear simple filter params when in advanced mode
					url.searchParams.delete('search');
					url.searchParams.delete('status');
					url.searchParams.delete('priority');
					url.searchParams.delete('label');

					if (currentFilterSerialized) {
						url.searchParams.set('filters', currentFilterSerialized);
					} else {
						url.searchParams.delete('filters');
					}

					goto(url.pathname + url.search, {
						replaceState: true,
						keepFocus: true,
						noScroll: true
					});
				}
			}
		});

	}

	// Add a new filter
	addFilter(filter: Omit<Filter, 'id'>): void {
		this.filters = [...this.filters, { ...filter, id: generateFilterId() }];
	}

	// Update an existing filter
	updateFilter(id: string, updates: Partial<Filter>): void {
		this.filters = this.filters.map((f) => (f.id === id ? { ...f, ...updates } : f));
	}

	// Remove a filter
	removeFilter(id: string): void {
		this.filters = this.filters.filter((f) => f.id !== id);
	}

	// Clear all filters
	clearFilters(): void {
		this.filters = [];
	}

	// Replace all filters
	setFilters(filters: Filter[]): void {
		this.filters = filters;
	}

	// Get filter by ID
	getFilter(id: string): Filter | undefined {
		return this.filters.find((f) => f.id === id);
	}

	// Check if any filters are active
	get hasFilters(): boolean {
		return this.filters.length > 0;
	}

	// Get filter count
	get count(): number {
		return this.filters.length;
	}

	// Serialize filters for URL/API
	serialize(): string {
		return serializeFilters(this.filters);
	}

	// Load filters from serialized string
	deserialize(serialized: string): void {
		this.filters = deserializeFilters(serialized);
	}

	// Get filters as plain array (for API calls)
	toArray(): Filter[] {
		return this.filters;
	}

	// Create URL search params from filters
	toURLSearchParams(): SvelteURLSearchParams {
		const params = new SvelteURLSearchParams();
		if (this.filters.length > 0) {
			params.set('filters', this.serialize());
		}
		return params;
	}

	// Load filters from URL search params
	fromURLSearchParams(params: URLSearchParams | SvelteURLSearchParams): void {
		const filtersParam = params.get('filters');
		if (filtersParam) {
			this.deserialize(filtersParam);
		} else {
			this.clearFilters();
		}
	}

	// Create a human-readable summary of active filters
	getSummary(): string {
		if (this.filters.length === 0) return 'No filters';
		if (this.filters.length === 1) return '1 filter';
		return `${this.filters.length} filters`;
	}

	// Switch between simple and advanced filter modes
	switchMode(newMode: FilterMode): void {
		if (newMode === this.mode) return;

		if (newMode === 'advanced') {
			// Convert existing simple filters to advanced
			const convertedFilters = convertSimpleFiltersToAdvanced();
			this.filters = convertedFilters;
			this.mode = 'advanced';
		} else {
			// Switch to simple mode - convert to simple URL params
			this.convertToSimpleFilters();
			this.mode = 'simple';
		}
	}

	// Convert current advanced filters to simple URL format
	convertToSimpleFilters(): void {
		const url = new SvelteURL(window.location.href);

		// Clear existing filter params
		url.searchParams.delete('filters');
		url.searchParams.delete('search');
		url.searchParams.delete('status');
		url.searchParams.delete('priority');
		url.searchParams.delete('label');

		// Convert filters to simple format
		for (const filter of this.filters) {
			if (filter.field === 'text' && filter.operator === 'contains' && typeof filter.value === 'string') {
				url.searchParams.set('search', filter.value);
			} else if (filter.field === 'status') {
				if (Array.isArray(filter.value)) {
					for (const status of filter.value) {
						url.searchParams.append('status', String(status));
					}
				} else if (filter.value) {
					url.searchParams.append('status', String(filter.value));
				}
			} else if (filter.field === 'priority') {
				if (Array.isArray(filter.value)) {
					for (const priority of filter.value) {
						url.searchParams.append('priority', String(priority));
					}
				} else if (filter.value) {
					url.searchParams.append('priority', String(filter.value));
				}
			} else if (filter.field === 'label') {
				if (Array.isArray(filter.value)) {
					for (const label of filter.value) {
						url.searchParams.append('label', String(label));
					}
				} else if (filter.value) {
					url.searchParams.append('label', String(filter.value));
				}
			}
		}

		// Clear filters array as we're now using simple mode
		this.filters = [];

		goto(url.pathname + url.search, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	// Get current filter mode
	get currentMode(): FilterMode {
		return this.mode;
	}

	// Check if we have any simple filters in the URL
	get hasSimpleFilters(): boolean {
		const url = page.url.searchParams;
		return url.has('search') || url.has('status') || url.has('priority') || url.has('label');
	}

	// Check if we have advanced filters
	get hasAdvancedFilters(): boolean {
		return this.filters.length > 0;
	}

	// Check if any filters are active (simple or advanced)
	get hasAnyFilters(): boolean {
		return this.hasSimpleFilters || this.hasAdvancedFilters;
	}
}
