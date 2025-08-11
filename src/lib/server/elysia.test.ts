import { Elysia, t } from 'elysia';
import type { Kysely } from 'kysely';
import type { DB } from './db/db.types';

export const createTestElysiaApp = (db: Kysely<DB>) =>
	new Elysia({ prefix: '/api' })
		// Mock organization derive for tests - always return a test organization
		.derive(async () => {
			return {
				organizationId: 'test-org-id',
				userId: 'test-user-id'
			};
		})
		.get('/', () => 'hi')
		.post('/', ({ body }) => body, {
			body: t.Object({
				name: t.String()
			})
		})
		.group('/todo', (app) =>
			app
				.get('/', async ({ organizationId }) => {
					if (!organizationId) {
						return [];
					}
					return db
						.selectFrom('todo')
						.selectAll()
						.where('organization_id', '=', organizationId)
						.orderBy('created_at', 'desc')
						.execute();
				})
				.post('/', async ({ body, organizationId }) => {
					if (!organizationId) {
						throw new Error('Organization ID is required');
					}

					const result = await db
						.insertInto('todo')
						.values({
							text: body.text,
							completed: body.completed ?? false,
							priority: body.priority ?? 'medium',
							status: body.status ?? 'todo',
							label: body.label ?? 'feature',
							organization_id: organizationId
						})
						.returningAll()
						.executeTakeFirst();

					return result;
				}, {
					body: t.Object({
						text: t.String(),
						completed: t.Optional(t.Boolean()),
						priority: t.Optional(t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high')])),
						status: t.Optional(t.Union([t.Literal('todo'), t.Literal('in progress'), t.Literal('done')])),
						label: t.Optional(t.Union([t.Literal('feature'), t.Literal('bug'), t.Literal('documentation')]))
					})
				})
				.patch('/toggle', async ({ body }) => {
					const result = await db
						.updateTable('todo')
						.set({ completed: body.completed, updated_at: new Date() })
						.where('id', '=', body.id)
						.returningAll()
						.execute();

					return result;
				}, {
					body: t.Object({
						id: t.Number(),
						completed: t.Boolean()
					})
				})
				.patch('/bulk', async ({ body }) => {
					const result = await db
						.updateTable('todo')
						.set({ ...body.updates, updated_at: new Date() })
						.where('id', 'in', body.ids)
						.returningAll()
						.execute();

					return result;
				}, {
					body: t.Object({
						ids: t.Array(t.Number()),
						updates: t.Object({
							completed: t.Optional(t.Boolean()),
							priority: t.Optional(t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high')])),
							status: t.Optional(t.Union([t.Literal('todo'), t.Literal('in progress'), t.Literal('done')])),
							label: t.Optional(t.Union([t.Literal('feature'), t.Literal('bug'), t.Literal('documentation')]))
						})
					})
				})
				.delete('/bulk', async ({ body }) => {
					const result = await db
						.deleteFrom('todo')
						.where('id', 'in', body.ids)
						.returningAll()
						.execute();

					return result;
				}, {
					body: t.Object({
						ids: t.Array(t.Number())
					})
				})
		)
		.group('/todo/:id', (app) =>
			app
				.patch('/', async ({ params, body }) => {
					const result = await db
						.updateTable('todo')
						.set({ ...body, updated_at: new Date() })
						.where('id', '=', Number(params.id))
						.returningAll()
						.executeTakeFirst();

					return result;
				}, {
					body: t.Object({
						text: t.Optional(t.String()),
						completed: t.Optional(t.Boolean()),
						priority: t.Optional(t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high')])),
						status: t.Optional(t.Union([t.Literal('todo'), t.Literal('in progress'), t.Literal('done')])),
						label: t.Optional(t.Union([t.Literal('feature'), t.Literal('bug'), t.Literal('documentation')]))
					})
				})
				.delete('/', async ({ params }) => {
					const result = await db
						.deleteFrom('todo')
						.where('id', '=', Number(params.id))
						.returningAll()
						.execute();

					return result;
				})
		)
		.group('/dashboard', (app) =>
			app
				.get('/stats', async ({ organizationId }) => {
					if (!organizationId) {
						return {
							totalTodos: 0,
							completedTodos: 0,
							inProgressTodos: 0,
							highPriorityTodos: 0,
							completionRate: 0,
							todosByStatus: {},
							todosByPriority: {},
							todosByLabel: {}
						};
					}

					const todos = await db
						.selectFrom('todo')
						.selectAll()
						.where('organization_id', '=', organizationId)
						.execute();

					const totalTodos = todos.length;
					const completedTodos = todos.filter(t => t.status === 'done').length;
					const inProgressTodos = todos.filter(t => t.status === 'in progress').length;
					const highPriorityTodos = todos.filter(t => t.priority === 'high' && t.status === 'todo').length;
					const completionRate = totalTodos === 0 ? 0 : Math.round((completedTodos / totalTodos) * 100);

					// Aggregate by status
					const todosByStatus = todos.reduce((acc, todo) => {
						acc[todo.status] = (acc[todo.status] || 0) + 1;
						return acc;
					}, {} as Record<string, number>);

					// Aggregate by priority
					const todosByPriority = todos.reduce((acc, todo) => {
						acc[todo.priority] = (acc[todo.priority] || 0) + 1;
						return acc;
					}, {} as Record<string, number>);

					// Aggregate by label
					const todosByLabel = todos.reduce((acc, todo) => {
						acc[todo.label] = (acc[todo.label] || 0) + 1;
						return acc;
					}, {} as Record<string, number>);

					return {
						totalTodos,
						completedTodos,
						inProgressTodos,
						highPriorityTodos,
						completionRate,
						todosByStatus,
						todosByPriority,
						todosByLabel
					};
				})
				.get('/activity', async ({ organizationId }) => {
					// Generate 30 days of activity data
					const activityData = [];
					const today = new Date();

					for (let i = 29; i >= 0; i--) {
						const date = new Date(today);
						date.setDate(date.getDate() - i);
						date.setHours(0, 0, 0, 0);

						const nextDate = new Date(date);
						nextDate.setDate(nextDate.getDate() + 1);

						if (!organizationId) {
							activityData.push({
								date: date.toISOString().split('T')[0],
								created: 0,
								completed: 0,
								inProgress: 0,
								total: 0
							});
							continue;
						}

						const todosCreatedOnDay = await db
							.selectFrom('todo')
							.select(db => db.fn.count<number>('id').as('count'))
							.where('organization_id', '=', organizationId)
							.where('created_at', '>=', date)
							.where('created_at', '<', nextDate)
							.executeTakeFirst();

						const todosCompletedOnDay = await db
							.selectFrom('todo')
							.select(db => db.fn.count<number>('id').as('count'))
							.where('organization_id', '=', organizationId)
							.where('status', '=', 'done')
							.where('updated_at', '>=', date)
							.where('updated_at', '<', nextDate)
							.executeTakeFirst();

						const todosInProgressOnDay = await db
							.selectFrom('todo')
							.select(db => db.fn.count<number>('id').as('count'))
							.where('organization_id', '=', organizationId)
							.where('status', '=', 'in progress')
							.where('updated_at', '>=', date)
							.where('updated_at', '<', nextDate)
							.executeTakeFirst();

						const totalTodosOnDay = await db
							.selectFrom('todo')
							.select(db => db.fn.count<number>('id').as('count'))
							.where('organization_id', '=', organizationId)
							.where('created_at', '<=', nextDate)
							.executeTakeFirst();

						activityData.push({
							date: date.toISOString().split('T')[0],
							created: Number(todosCreatedOnDay?.count || 0),
							completed: Number(todosCompletedOnDay?.count || 0),
							inProgress: Number(todosInProgressOnDay?.count || 0),
							total: Number(totalTodosOnDay?.count || 0)
						});
					}

					return activityData;
				})
		);
