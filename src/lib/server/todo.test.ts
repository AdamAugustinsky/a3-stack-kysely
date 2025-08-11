import { test, expect, afterAll } from 'bun:test';
import { createElysiaEdenTestApp } from './test.utils';

const { eden, cleanup, db } = await createElysiaEdenTestApp();

afterAll(cleanup);

// Helper function to create a test todo
const createTestTodo = async (overrides = {}) => {
	const defaultTodo = {
		text: 'Test todo',
		completed: false,
		priority: 'medium' as const,
		status: 'todo' as const,
		label: 'feature' as const
	};

	const response = await eden.api.todo.post({
		...defaultTodo,
		...overrides
	});

	return response;
};

// Helper function to create multiple test todos
const createMultipleTodos = async (count: number) => {
	const todos = [];
	for (let i = 0; i < count; i++) {
		const response = await createTestTodo({
			text: `Test todo ${i + 1}`,
			priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
			status: i % 4 === 0 ? 'done' : i % 4 === 1 ? 'in progress' : 'todo'
		});
		todos.push(response);
	}
	return todos;
};

test('GET /api/todo - should return empty array initially', async () => {
	const response = await eden.api.todo.get();

	expect(response.data).toBeInstanceOf(Array);
	expect(response.data).toHaveLength(0);
});

test('POST /api/todo - should create a todo with minimal data', async () => {
	const newTodo = {
		text: 'New test todo'
	};

	const response = await createTestTodo(newTodo);

	expect(response.error).toBeNull();
	expect(response.data).toBeDefined();
});

test('POST /api/todo - should create a todo with all fields', async () => {
	const newTodo = {
		text: 'Complete test todo',
		completed: true,
		priority: 'high' as const,
		status: 'done' as const,
		label: 'bug' as const
	};

	const response = await createTestTodo(newTodo);

	expect(response.error).toBeNull();
	expect(response.data).toBeDefined();
});

test('POST /api/todo - should use default values for optional fields', async () => {
	const newTodo = {
		text: 'Todo with defaults'
	};

	await createTestTodo(newTodo);

	const todos = await eden.api.todo.get();
	const createdTodo = todos.data?.find((todo) => todo.text === newTodo.text);

	expect(createdTodo?.completed).toBe(false);
	expect(createdTodo?.priority).toBe('medium');
	expect(createdTodo?.status).toBe('todo');
	expect(createdTodo?.label).toBe('feature');
	expect(createdTodo?.created_at).toBeDefined();
	expect(createdTodo?.updated_at).toBeDefined();
});

test('PATCH /api/todo/toggle - should toggle todo completion', async () => {
	await createTestTodo({ text: 'Toggle test', completed: false });
	const todos = await eden.api.todo.get();
	const todo = todos.data?.find((t) => t.text === 'Toggle test');

	expect(todo?.completed).toBe(false);

	const toggleResponse = await eden.api.todo.toggle.patch({
		id: todo!.id,
		completed: true
	});

	expect(toggleResponse.error).toBeNull();

	const updatedTodos = await eden.api.todo.get();
	const updatedTodo = updatedTodos.data?.find((t) => t.id === todo!.id);

	expect(updatedTodo?.completed).toBe(true);
});

test('PATCH /api/todo/:id - should update todo fields', async () => {
	await createTestTodo({ text: 'Original todo' });
	const todos = await eden.api.todo.get();
	const todo = todos.data?.find((t) => t.text === 'Original todo');

	const updateData = {
		text: 'Updated todo text',
		label: 'documentation' as const,
		status: 'in progress' as const,
		priority: 'high' as const
	};

	const response = await eden.api.todo({ id: todo!.id }).patch(updateData);

	expect(response.error).toBeNull();

	const updatedTodos = await eden.api.todo.get();
	const updatedTodo = updatedTodos.data?.find((t) => t.id === todo!.id);

	expect(updatedTodo?.text).toBe(updateData.text);
	expect(updatedTodo?.label).toBe(updateData.label);
	expect(updatedTodo?.status).toBe(updateData.status);
	expect(updatedTodo?.priority).toBe(updateData.priority);
});

test('DELETE /api/todo/:id - should delete a todo', async () => {
	await createTestTodo({ text: 'Todo to delete' });
	const todos = await eden.api.todo.get();
	const todoToDelete = todos.data?.find((t) => t.text === 'Todo to delete');
	const initialCount = todos.data?.length || 0;

	const response = await eden.api.todo({ id: todoToDelete!.id }).delete();

	expect(response.error).toBeNull();

	const remainingTodos = await eden.api.todo.get();
	expect(remainingTodos.data?.length).toBe(initialCount - 1);
	expect(remainingTodos.data?.find((t) => t.id === todoToDelete!.id)).toBeUndefined();
});

test('PATCH /api/todo/bulk - should update multiple todos', async () => {
	await createMultipleTodos(3);
	const todos = await eden.api.todo.get();
	const todoIds = todos.data?.slice(0, 2).map((t) => t.id) || [];

	const bulkUpdate = {
		ids: todoIds,
		updates: {
			status: 'done' as const,
			priority: 'low' as const
		}
	};

	const response = await eden.api.todo.bulk.patch(bulkUpdate);

	expect(response.error).toBeNull();

	const updatedTodos = await eden.api.todo.get();
	const updatedItems = updatedTodos.data?.filter((t) => todoIds.includes(t.id));

	expect(updatedItems?.every((t) => t.status === 'done')).toBe(true);
	expect(updatedItems?.every((t) => t.priority === 'low')).toBe(true);
});

test('DELETE /api/todo/bulk - should delete multiple todos', async () => {
	await createMultipleTodos(4);
	const todos = await eden.api.todo.get();
	const todoIds = todos.data?.slice(0, 2).map((t) => t.id) || [];
	const initialCount = todos.data?.length || 0;

	const response = await eden.api.todo.bulk.delete({
		ids: todoIds
	});

	expect(response.error).toBeNull();

	const remainingTodos = await eden.api.todo.get();
	expect(remainingTodos.data?.length).toBe(initialCount - 2);

	const deletedItems = remainingTodos.data?.filter((t) => todoIds.includes(t.id));
	expect(deletedItems?.length).toBe(0);
});

test('GET /api/dashboard/stats - should return correct statistics', async () => {
	// Clear existing todos for clean test
	await db.deleteFrom('todo').execute();

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

	const response = await eden.api.dashboard.stats.get();

	expect(response.error).toBeNull();
	expect(response.data).toBeDefined();

	const stats = response.data!;

	expect(stats.totalTodos).toBe(4);
	expect(stats.completedTodos).toBe(1);
	expect(stats.inProgressTodos).toBe(1);
	expect(stats.highPriorityTodos).toBe(2); // High priority todos with status 'todo'
	expect(stats.completionRate).toBe(25); // 1/4 * 100 = 25%

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

test('GET /api/dashboard/stats - should handle empty state', async () => {
	// Clear existing todos for clean test
	await db.deleteFrom('todo').execute();

	const response = await eden.api.dashboard.stats.get();

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

test('GET /api/dashboard/activity - should return activity data', async () => {
	// Create some todos to generate activity
	await createTestTodo({ text: 'Activity test 1' });
	await createTestTodo({ text: 'Activity test 2', status: 'done' });

	const response = await eden.api.dashboard.activity.get();

	expect(response.error).toBeNull();
	expect(response.data).toBeDefined();
	expect(response.data).toBeInstanceOf(Array);
	expect(response.data?.length).toBe(30); // 30-day window

	// Each day should have the expected structure
	const today = response.data?.[29]; // Last day should be today
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

test('GET /api/dashboard/activity - should return dense 30-day series', async () => {
	const response = await eden.api.dashboard.activity.get();

	expect(response.data?.length).toBe(30);

	// Verify dates are sequential
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

test('PATCH /api/todo/toggle - should fail with invalid id', async () => {
	const response = await eden.api.todo.toggle.patch({
		id: 999999, // Non-existent ID
		completed: true
	});

	// Should not error but should handle gracefully
	expect(response.data).toBeEmpty();
});

test('DELETE /api/todo/:id - should handle non-existent id gracefully', async () => {
	const response = await eden.api.todo({ id: 999999 }).delete();

	// Should not error but should handle gracefully
	expect(response.data).toBeEmpty();
});
