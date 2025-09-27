import * as v from 'valibot';

export type TextOperator =
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'starts_with'
    | 'ends_with'
    | 'is_empty'
    | 'is_not_empty';

export type NumberOperator =
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'greater_than_or_equal'
    | 'less_than_or_equal'
    | 'between'
    | 'not_between';

export type DateOperator =
    | 'equals'
    | 'not_equals'
    | 'before'
    | 'after'
    | 'on_or_before'
    | 'on_or_after'
    | 'between'
    | 'not_between'
    | 'is_today'
    | 'is_yesterday'
    | 'is_this_week'
    | 'is_this_month'
    | 'is_this_year'
    | 'is_last_n_days'
    | 'is_next_n_days';

export type SelectOperator =
    | 'is'
    | 'is_not'
    | 'is_any_of'
    | 'is_none_of'
    | 'is_empty'
    | 'is_not_empty';

export type BooleanOperator = 'is_true' | 'is_false';

export type FilterOperator =
    | TextOperator
    | NumberOperator
    | DateOperator
    | SelectOperator
    | BooleanOperator
    | UtmOperator;

export type UtmOperator =
    | 'exists'
    | 'not_exists'
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'starts_with'
    | 'ends_with'
    | 'is_empty'
    | 'is_not_empty';

export type FilterType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'utm';

export type FilterValue =
    | string
    | number
    | boolean
    | Date
    | string[]
    | number[]
    | [number, number]
    | [Date, Date]
    | null;

export interface Filter {
    id: string;
    field: string;
    operator: FilterOperator;
    value: FilterValue;
    type: FilterType;
}

export interface FilterGroup {
    id: string;
    logic: 'and' | 'or';
    filters: Filter[];
}

export interface FilterConfig {
    field: string;
    label: string;
    type: FilterType;
    operators?: FilterOperator[];
    options?: Array<{ label: string; value: string | number }>;
    placeholder?: string;
    defaultOperator?: FilterOperator;
    defaultValue?: FilterValue;
    // For number/date ranges
    min?: number | Date;
    max?: number | Date;
    step?: number;
    // UI hints
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon?: any; // Lucide icon component
    description?: string;
    format?: string; // For date formatting
}

// Operator display labels
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
    // Text operators
    equals: 'is',
    not_equals: 'is not',
    contains: 'contains',
    not_contains: 'does not contain',
    starts_with: 'starts with',
    ends_with: 'ends with',
    is_empty: 'is empty',
    is_not_empty: 'is not empty',

    // Number operators
    greater_than: '>',
    less_than: '<',
    greater_than_or_equal: '≥',
    less_than_or_equal: '≤',
    between: 'between',
    not_between: 'not between',

    // Date operators
    before: 'before',
    after: 'after',
    on_or_before: 'on or before',
    on_or_after: 'on or after',
    is_today: 'is today',
    is_yesterday: 'is yesterday',
    is_this_week: 'this week',
    is_this_month: 'this month',
    is_this_year: 'this year',
    is_last_n_days: 'in last',
    is_next_n_days: 'in next',

    // Select operators
    is: 'is',
    is_not: 'is not',
    is_any_of: 'is any of',
    is_none_of: 'is none of',

    // Boolean operators
    is_true: 'is true',
    is_false: 'is false',

    // UTM operators
    exists: 'exists',
    not_exists: 'does not exist'
};

// Get available operators for a field type
export function getOperatorsForType(type: FilterType): FilterOperator[] {
    switch (type) {
        case 'text':
            return [
                'equals',
                'not_equals',
                'contains',
                'not_contains',
                'starts_with',
                'ends_with',
                'is_empty',
                'is_not_empty'
            ];
        case 'number':
            return [
                'equals',
                'not_equals',
                'greater_than',
                'less_than',
                'greater_than_or_equal',
                'less_than_or_equal',
                'between',
                'not_between'
            ];
        case 'date':
            return [
                'equals',
                'not_equals',
                'before',
                'after',
                'on_or_before',
                'on_or_after',
                'between',
                'not_between',
                'is_today',
                'is_yesterday',
                'is_this_week',
                'is_this_month',
                'is_this_year',
                'is_last_n_days',
                'is_next_n_days'
            ];
        case 'select':
            return ['is', 'is_not', 'is_empty', 'is_not_empty'];
        case 'multiselect':
            return ['is_any_of', 'is_none_of', 'is_empty', 'is_not_empty'];
        case 'boolean':
            return ['is_true', 'is_false'];
        case 'utm':
            return [
                'exists',
                'not_exists',
                'equals',
                'not_equals',
                'contains',
                'not_contains',
                'starts_with',
                'ends_with',
                'is_empty',
                'is_not_empty'
            ];
    }
}

// Check if operator requires a value input
export function operatorRequiresValue(operator: FilterOperator): boolean {
    const noValueOperators: FilterOperator[] = [
        'is_empty',
        'is_not_empty',
        'is_today',
        'is_yesterday',
        'is_this_week',
        'is_this_month',
        'is_this_year',
        'is_true',
        'is_false',
        'exists',
        'not_exists'
    ];
    return !noValueOperators.includes(operator);
}

// Check if operator requires two values (range)
export function operatorRequiresRange(operator: FilterOperator): boolean {
    return operator === 'between' || operator === 'not_between';
}

// Check if operator requires a number input (for relative dates)
export function operatorRequiresNumber(operator: FilterOperator): boolean {
    return operator === 'is_last_n_days' || operator === 'is_next_n_days';
}

// Serialize filters for URL/API
export function serializeFilters(filters: Filter[]): string {
    return JSON.stringify(filters);
}

// Deserialize filters from URL/API
export function deserializeFilters(serialized: string): Filter[] {
    try {
        return JSON.parse(serialized) as Filter[];
    } catch {
        return [];
    }
}

// Check if field is a UTM field (format: utm.field_name)
export function isUtmField(field: string): boolean {
    return field.startsWith('utm.');
}

// Extract UTM field name from utm.field_name format
export function extractUtmFieldName(field: string): string {
    return field.replace('utm.', '');
}

// Generate unique filter ID
export function generateFilterId(): string {
    return `filter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const filterSchema = v.object({
    id: v.string(),
    field: v.string(),
    operator: v.string(),
    value: v.any(),
    type: v.union([
        v.literal('text'),
        v.literal('number'),
        v.literal('date'),
        v.literal('select'),
        v.literal('multiselect'),
        v.literal('boolean'),
        v.literal('utm')
    ])
});