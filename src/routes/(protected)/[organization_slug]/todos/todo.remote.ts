import { command, form, query, getRequestEvent } from '$app/server';
import { Task } from '$lib/schemas/todo';
import { eden } from '$lib/server/eden';
import { headersToRecord } from '$lib/server/headers-helper';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';
import { filterSchema } from '$lib/utils/filter';

// Query functions
const toTask = (input: {
	readonly id: number;
	readonly text: string;
	readonly completed: boolean;
	readonly priority: string;
	readonly status: string;
	readonly label: string;
	readonly created_at: string | Date;
	readonly updated_at: string | Date;
}): Task => {
	const createdAt =
		input.created_at instanceof Date ? input.created_at : new Date(input.created_at);
	const updatedAt =
		input.updated_at instanceof Date ? input.updated_at : new Date(input.updated_at);
	return v.parse(Task, {
		id: input.id,
		text: input.text,
		completed: input.completed,
		priority: input.priority,
		status: input.status,
		label: input.label,
		createdAt,
		updatedAt
	});
};

const getTodosSchema = v.optional(v.array(filterSchema));

export const getTodos = query(getTodosSchema, async (filters) => {
	const headers = headersToRecord(getRequestEvent().request.headers);
	const queryParams = filters && filters.length > 0 ? { filters: JSON.stringify(filters) } : {};

	const response = await eden.api.todo.get({
		headers,
		query: queryParams
	});

	if (response.error) {
		console.error('Remote function - API error:', response.error);
		error(500, 'Failed to fetch todos');
	}
	console.log('Remote function - received', response.data.length, 'todos from API');
	return response.data.map(toTask);
});

// Form schema for create todo - handles form data string conversion
const createTodoFormSchema = v.object({
	text: v.pipe(v.string(), v.nonEmpty('Task description is required')),
	completed: v.optional(
		v.pipe(
			v.string(),
			v.transform((val) => val === 'true')
		)
	),
	label: v.union(
		[v.literal('bug'), v.literal('feature'), v.literal('documentation')],
		'Please select a valid label: bug, feature, or documentation'
	),
	status: v.union(
		[
			v.literal('backlog'),
			v.literal('todo'),
			v.literal('in progress'),
			v.literal('done'),
			v.literal('canceled')
		],
		'Please select a valid status: backlog, todo, in progress, done, or canceled'
	),
	priority: v.union(
		[v.literal('low'), v.literal('medium'), v.literal('high')],
		'Please select a valid priority: low, medium, or high'
	)
});

export const createTodo = form(
	createTodoFormSchema,
	async ({ text, completed, priority, status, label }) => {
		const headers = headersToRecord(getRequestEvent().request.headers);
		const response = await eden.api.todo.post(
			{
				text,
				completed,
				priority,
				status,
				label
			},
			{ headers }
		);

		if (response.error) {
			console.error('Failed to create todo', response.error);
			error(500, 'Failed to create todo');
		}

		return { success: true };
	}
);

// Delete a single todo
const deleteTodoSchema = v.object({
	id: v.number('ID must be a number')
});

export const deleteTodo = command(deleteTodoSchema, async ({ id }) => {
	const headers = headersToRecord(getRequestEvent().request.headers);
	const response = await eden.api.todo({ id }).delete({ headers });

	if (response.error) {
		error(404, 'Todo not found');
	}

	// Note: Query will be refreshed automatically when the component re-renders

	return { success: true };
});

// Bulk update todos
const bulkUpdateTodosSchema = v.object({
	ids: v.array(v.number('ID must be a number')),
	updates: v.object({
		status: v.optional(
			v.union([
				v.literal('backlog'),
				v.literal('todo'),
				v.literal('in progress'),
				v.literal('done'),
				v.literal('canceled')
			])
		),
		priority: v.optional(v.union([v.literal('low'), v.literal('medium'), v.literal('high')])),
		label: v.optional(
			v.union([v.literal('bug'), v.literal('feature'), v.literal('documentation')])
		),
		completed: v.optional(v.boolean())
	})
});

export const bulkUpdateTodos = command(bulkUpdateTodosSchema, async ({ ids, updates }) => {
	if (ids.length === 0) {
		error(400, 'No todo IDs provided');
	}

	// Filter out undefined values from updates
	const filteredUpdates = Object.fromEntries(
		Object.entries(updates).filter(([, value]) => value !== undefined)
	) as Partial<{
		priority: Task['priority'];
		status: Task['status'];
		text: Task['text'];
		label: Task['label'];
		completed: boolean;
	}>;

	if (Object.keys(filteredUpdates).length === 0) {
		error(400, 'No valid updates provided');
	}

	const headers = headersToRecord(getRequestEvent().request.headers);
	const response = await eden.api.todo.bulk.patch(
		{
			ids,
			updates: filteredUpdates
		},
		{ headers }
	);

	if (response.error) {
		error(404, 'No todos found with the provided IDs');
	}

	// Note: Query will be refreshed automatically when the component re-renders

	return { success: true, updatedCount: ids.length };
});

// Bulk delete todos
const bulkDeleteTodosSchema = v.object({
	ids: v.array(v.number('ID must be a number'))
});

export const bulkDeleteTodos = command(bulkDeleteTodosSchema, async ({ ids }) => {
	if (ids.length === 0) {
		error(400, 'No todo IDs provided');
	}

	const headers = headersToRecord(getRequestEvent().request.headers);
	const response = await eden.api.todo.bulk.delete(
		{
			ids
		},
		{ headers }
	);

	if (response.error) {
		error(404, 'No todos found with the provided IDs');
	}

	// Note: Query will be refreshed automatically when the component re-renders

	return { success: true, deletedCount: ids.length };
});

// Update todo schema - for form submissions, we need to handle the ID transformation and string-to-boolean conversion

const updateTodoFormSchema = v.object({
	id: v.pipe(
		v.string(),
		v.transform((val) => parseInt(val, 10)),
		v.number('ID must be a number')
	),
	text: v.optional(v.pipe(v.string(), v.nonEmpty('Task description is required'))),
	completed: v.optional(
		v.pipe(
			v.string(),
			v.transform((val) => val === 'true')
		)
	),
	label: v.optional(
		v.union(
			[v.literal('bug'), v.literal('feature'), v.literal('documentation')],
			'Please select a valid label: bug, feature, or documentation'
		)
	),
	status: v.optional(
		v.union(
			[
				v.literal('backlog'),
				v.literal('todo'),
				v.literal('in progress'),
				v.literal('done'),
				v.literal('canceled')
			],
			'Please select a valid status: backlog, todo, in progress, done, or canceled'
		)
	),
	priority: v.optional(
		v.union(
			[v.literal('low'), v.literal('medium'), v.literal('high')],
			'Please select a valid priority: low, medium, or high'
		)
	)
});

// Update a single todo
export const updateTodo = form(updateTodoFormSchema, async ({ id, ...maybeUpdates }) => {
	const headers = headersToRecord(getRequestEvent().request.headers);
	const updates = Object.fromEntries(
		Object.entries(maybeUpdates).filter(([, value]) => value !== undefined)
	) as Partial<Pick<Task, 'text' | 'label' | 'status' | 'priority'>> & {
		completed?: boolean;
	};

	if (Object.keys(updates).length === 0) {
		error(400, 'No updates provided');
	}

	const response = await eden.api.todo({ id }).patch(updates, { headers });

	if (response.error) {
		return error(404, { message: 'Todo not found' });
	}

	return { success: true };
});
