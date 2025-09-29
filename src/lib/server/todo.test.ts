import { test, expect, afterAll, beforeAll, describe } from 'bun:test';
import { createElysiaEdenTestApp } from './test.utils';
import type { Kysely } from 'kysely';
import type { DB } from './db/db.types';

let eden: Awaited<ReturnType<typeof createElysiaEdenTestApp>>['eden'];
let cleanup = () => {};
let db: Kysely<DB>;
let organizationId: string;
let organizationSlug: string;

beforeAll(async () => {
	const testApp = await createElysiaEdenTestApp();
	eden = testApp.eden;
	cleanup = testApp.cleanup;
	db = testApp.db;
	organizationId = testApp.organizationId;
	organizationSlug = testApp.organizationSlug;
});

afterAll(() => cleanup());

// Test helpers
const createTestTodo = async (overrides = {}) => {
	const defaultTodo = {
		text: 'Test todo',
		completed: false,
		priority: 'medium' as const,
		status: 'todo' as const,
		label: 'feature' as const
	};

	return await eden.api.org({ organizationSlug }).todo.post({ ...defaultTodo, ...overrides });
};

const createMultipleTodos = async (count: number) => {
	const todos = [];
	for (let i = 0; i < count; i++) {
		const response = await createTestTodo({
			text: `Test todo ${i + 1}`,
			priority: ['high', 'medium', 'low'][i % 3],
			status: ['done', 'in progress', 'todo', 'todo'][i % 4]
		});
		todos.push(response);
	}
	return todos;
};

const clearTodos = async () => {
	await db.deleteFrom('todo').where('organization_id', '=', organizationId).execute();
};

describe('Todo CRUD Operations', () => {
	test('GET /api/todo - returns empty array initially', async () => {
		const response = await eden.api.org({ organizationSlug }).todo.get({});

		expect(response.data).toBeInstanceOf(Array);
		expect(response.data).toHaveLength(0);
	});

	test('POST /api/todo - creates todo with minimal data', async () => {
		const response = await createTestTodo({ text: 'Minimal todo' });

		expect(response.error).toBeNull();
		expect(response.data).toBeDefined();
	});

	test('POST /api/todo - creates todo with all fields', async () => {
		const response = await createTestTodo({
			text: 'Complete todo',
			completed: true,
			priority: 'high' as const,
			status: 'done' as const,
			label: 'bug' as const
		});

		expect(response.error).toBeNull();
		expect(response.data).toBeDefined();
	});

	test('POST /api/todo - applies default values correctly', async () => {
		const todoText = 'Todo with defaults';
		await createTestTodo({ text: todoText });

		const todos = await eden.api.org({ organizationSlug }).todo.get({});
		const createdTodo = todos.data?.find((todo) => todo.text === todoText);

		expect(createdTodo?.completed).toBe(false);
		expect(createdTodo?.priority).toBe('medium');
		expect(createdTodo?.status).toBe('todo');
		expect(createdTodo?.label).toBe('feature');
		expect(createdTodo?.created_at).toBeDefined();
		expect(createdTodo?.updated_at).toBeDefined();
	});

	test('PATCH /api/todo/:id - updates todo fields', async () => {
		await createTestTodo({ text: 'Original todo' });
		const todos = await eden.api.org({ organizationSlug }).todo.get({});
		const todo = todos.data?.find((t) => t.text === 'Original todo');

		const updateData = {
			text: 'Updated todo text',
			label: 'documentation' as const,
			status: 'in progress' as const,
			priority: 'high' as const
		};

		const response = await eden.api
			.org({ organizationSlug })
			.todo({ id: todo!.id })
			.patch(updateData);
		expect(response.error).toBeNull();

		const updatedTodos = await eden.api.org({ organizationSlug }).todo.get({});
		const updatedTodo = updatedTodos.data?.find((t) => t.id === todo!.id);

		expect(updatedTodo?.text).toBe(updateData.text);
		expect(updatedTodo?.label).toBe(updateData.label);
		expect(updatedTodo?.status).toBe(updateData.status);
		expect(updatedTodo?.priority).toBe(updateData.priority);
	});

	test('DELETE /api/todo/:id - removes todo', async () => {
		await createTestTodo({ text: 'Todo to delete' });
		const todos = await eden.api.org({ organizationSlug }).todo.get({});
		const todoToDelete = todos.data?.find((t) => t.text === 'Todo to delete');
		const initialCount = todos.data?.length || 0;

		const response = await eden.api
			.org({ organizationSlug })
			.todo({ id: todoToDelete!.id })
			.delete();
		expect(response.error).toBeNull();

		const remainingTodos = await eden.api.org({ organizationSlug }).todo.get({});
		expect(remainingTodos.data?.length).toBe(initialCount - 1);
		expect(remainingTodos.data?.find((t) => t.id === todoToDelete!.id)).toBeUndefined();
	});
});

describe('Todo Toggle Operation', () => {
	test('PATCH /api/todo/toggle - toggles completion status', async () => {
		await createTestTodo({ text: 'Toggle test', completed: false });
		const todos = await eden.api.org({ organizationSlug }).todo.get({});
		const todo = todos.data?.find((t) => t.text === 'Toggle test');

		expect(todo?.completed).toBe(false);

		const toggleResponse = await eden.api.org({ organizationSlug }).todo.toggle.patch({
			id: todo!.id,
			completed: true
		});
		expect(toggleResponse.error).toBeNull();

		const updatedTodos = await eden.api.org({ organizationSlug }).todo.get({});
		const updatedTodo = updatedTodos.data?.find((t) => t.id === todo!.id);

		expect(updatedTodo?.completed).toBe(true);
	});

	test('PATCH /api/todo/toggle - handles invalid id gracefully', async () => {
		const response = await eden.api.org({ organizationSlug }).todo.toggle.patch({
			id: 999999,
			completed: true
		});

		expect(response.data).toBeEmpty();
	});
});

describe('Bulk Operations', () => {
	test('PATCH /api/todo/bulk - updates multiple todos', async () => {
		await createMultipleTodos(3);
		const todos = await eden.api.org({ organizationSlug }).todo.get({});
		const todoIds = todos.data?.slice(0, 2).map((t) => t.id) || [];

		const response = await eden.api.org({ organizationSlug }).todo.bulk.patch({
			ids: todoIds,
			updates: {
				status: 'done' as const,
				priority: 'low' as const
			}
		});

		expect(response.error).toBeNull();

		const updatedTodos = await eden.api.org({ organizationSlug }).todo.get({});
		const updatedItems = updatedTodos.data?.filter((t) => todoIds.includes(t.id));

		expect(updatedItems?.every((t) => t.status === 'done')).toBe(true);
		expect(updatedItems?.every((t) => t.priority === 'low')).toBe(true);
	});

	test('DELETE /api/todo/bulk - deletes multiple todos', async () => {
		await createMultipleTodos(4);
		const todos = await eden.api.org({ organizationSlug }).todo.get({});
		const todoIds = todos.data?.slice(0, 2).map((t) => t.id) || [];
		const initialCount = todos.data?.length || 0;

		const response = await eden.api.org({ organizationSlug }).todo.bulk.delete({ ids: todoIds });
		expect(response.error).toBeNull();

		const remainingTodos = await eden.api.org({ organizationSlug }).todo.get({});
		expect(remainingTodos.data?.length).toBe(initialCount - 2);

		const deletedItems = remainingTodos.data?.filter((t) => todoIds.includes(t.id));
		expect(deletedItems?.length).toBe(0);
	});
});

describe('Dashboard Statistics', () => {
	test('GET /api/dashboard/stats - calculates statistics correctly', async () => {
		await clearTodos();

		// Create todos with known distribution
		await createTestTodo({ text: 'Todo 1', status: 'todo', priority: 'high', label: 'feature' });
		await createTestTodo({ text: 'Todo 2', status: 'done', priority: 'medium', label: 'bug' });
		await createTestTodo({
			text: 'Todo 3',
			status: 'in progress',
			priority: 'low',
			label: 'feature'
		});
		await createTestTodo({
			text: 'Todo 4',
			status: 'todo',
			priority: 'high',
			label: 'documentation'
		});

		const response = await eden.api.org({ organizationSlug }).dashboard.stats.get();

		expect(response.error).toBeNull();
		expect(response.data).toBeDefined();

		const stats = response.data!;

		expect(stats.totalTodos).toBe(4);
		expect(stats.completedTodos).toBe(1);
		expect(stats.inProgressTodos).toBe(1);
		expect(stats.highPriorityTodos).toBe(2);
		expect(stats.completionRate).toBe(25);

		expect(stats.todosByStatus).toEqual({
			todo: 2,
			done: 1,
			'in progress': 1
		});

		expect(stats.todosByPriority).toEqual({
			high: 2,
			medium: 1,
			low: 1
		});

		expect(stats.todosByLabel).toEqual({
			feature: 2,
			bug: 1,
			documentation: 1
		});
	});

	test('GET /api/dashboard/stats - handles empty state', async () => {
		await clearTodos();

		const response = await eden.api.org({ organizationSlug }).dashboard.stats.get();

		expect(response.error).toBeNull();
		expect(response.data).toBeDefined();

		const stats = response.data!;

		expect(stats.totalTodos).toBe(0);
		expect(stats.completedTodos).toBe(0);
		expect(stats.inProgressTodos).toBe(0);
		expect(stats.highPriorityTodos).toBe(0);
		expect(stats.completionRate).toBe(0);
		expect(stats.todosByStatus).toEqual({});
		expect(stats.todosByPriority).toEqual({});
		expect(stats.todosByLabel).toEqual({});
	});
});

describe('Dashboard Activity', () => {
	test('GET /api/dashboard/activity - returns 30-day activity window', async () => {
		await createTestTodo({ text: 'Activity test 1' });
		await createTestTodo({ text: 'Activity test 2', status: 'done' });

		const response = await eden.api.org({ organizationSlug }).dashboard.activity.get();

		expect(response.error).toBeNull();
		expect(response.data).toBeDefined();
		expect(response.data).toBeInstanceOf(Array);
		expect(response.data?.length).toBe(30);

		const today = response.data?.[29];
		expect(today).toHaveProperty('date');
		expect(today).toHaveProperty('created');
		expect(today).toHaveProperty('completed');
		expect(today).toHaveProperty('inProgress');
		expect(today).toHaveProperty('total');

		expect(typeof today?.created).toBe('number');
		expect(typeof today?.completed).toBe('number');
		expect(typeof today?.inProgress).toBe('number');
		expect(typeof today?.total).toBe('number');
	});

	test('GET /api/dashboard/activity - returns sequential dates', async () => {
		const response = await eden.api.org({ organizationSlug }).dashboard.activity.get();

		expect(response.data?.length).toBe(30);

		const dates = response.data?.map((d) => new Date(d.date)) || [];
		for (let i = 1; i < dates.length; i++) {
			const prevDate = dates[i - 1];
			const currentDate = dates[i];
			const diffInDays = Math.floor(
				(currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
			);
			expect(diffInDays).toBe(1);
		}
	});
});

describe('Error Handling', () => {
	test('DELETE /api/todo/:id - handles non-existent id', async () => {
		const response = await eden.api.org({ organizationSlug }).todo({ id: 999999 }).delete();
		expect(response.data).toBeEmpty();
	});
});
