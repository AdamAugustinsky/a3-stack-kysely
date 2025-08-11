import { command, form, query, getRequestEvent } from '$app/server';
import { CreateTask } from '$lib/schemas/todo';
import { eden } from '$lib/server/eden';
import { headersToRecord } from '$lib/server/headers-helper';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

// Query functions
export const getTodos = query(async () => {
	const headers = headersToRecord(getRequestEvent().request.headers);
	const response = await eden.api.todo.get({ headers });
	if (response.error) {
		error(500, 'Failed to fetch todos');
	}
	return response.data;
});

export const createTodo = form(async (data) => {
	const headers = headersToRecord(getRequestEvent().request.headers);
	const validatedTodoData = v.safeParse(CreateTask, Object.fromEntries(data.entries()));

	if (validatedTodoData.success) {
		const response = await eden.api.todo.post(
			{
				text: validatedTodoData.output.text,
				completed: validatedTodoData.output.completed,
				priority: validatedTodoData.output.priority,
				status: validatedTodoData.output.status,
				label: validatedTodoData.output.label
			},
			{ headers }
		);

		if (response.error) {
			error(500, 'Failed to create todo');
		}

		return { success: true };
	} else {
		// Convert issues to human-readable format using flatten()
		const flattenedErrors = v.flatten(validatedTodoData.issues);

		console.error('Validation failed:', flattenedErrors);

		// Use SvelteKit error with custom object structure
		const nestedErrors: Record<string, string[]> = {};
		if (flattenedErrors.nested) {
			for (const [key, value] of Object.entries(flattenedErrors.nested)) {
				if (value) {
					nestedErrors[key] = value;
				}
			}
		}

		return error(400, {
			message: 'Validation failed',
			errors: {
				nested: nestedErrors
			}
		});
	}
});

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
	);

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

// Update todo schema
const updateTodoSchema = v.object({
	id: v.pipe(
		v.string(),
		v.transform((val) => parseInt(val, 10)),
		v.number()
	),
	...CreateTask.entries
});

// Update a single todo
export const updateTodo = form(async (data) => {
	const validatedData = v.safeParse(updateTodoSchema, Object.fromEntries(data.entries()));

	if (!validatedData.success) {
		// Convert issues to human-readable format using flatten()
		const flattenedErrors = v.flatten(validatedData.issues);

		console.error('Validation failed:', flattenedErrors);

		// Use SvelteKit error with custom object structure
		const nestedErrors: Record<string, string[]> = {};
		if (flattenedErrors.nested) {
			for (const [key, value] of Object.entries(flattenedErrors.nested)) {
				if (value) {
					nestedErrors[key] = value;
				}
			}
		}

		return error(400, {
			message: 'Validation failed',
			errors: {
				nested: nestedErrors
			}
		});
	}

	const { id: todoId, ...updateData } = validatedData.output;

	const headers = headersToRecord(getRequestEvent().request.headers);
	const response = await eden.api.todo({ id: todoId }).patch(
		{
			text: updateData.text,
			label: updateData.label,
			status: updateData.status,
			priority: updateData.priority
		},
		{ headers }
	);

	if (response.error) {
		return error(404, { message: 'Todo not found' });
	}

	return { success: true };
});
