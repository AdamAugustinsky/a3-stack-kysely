import { Elysia, t } from 'elysia';
import { createAuth } from './auth';
import type { Kysely } from 'kysely';
import type { DB } from './db/db.types';
import { applyFilters, parseFilters } from '@/utils/kysely-filter-builder';

export const createElysiaApp = (db: Kysely<DB>, auth: ReturnType<typeof createAuth>) =>
	new Elysia({ prefix: '/api' })
		// Derive organization from session for all routes
		.derive(async ({ headers }) => {
			// Convert headers to the Headers format expected by auth.api
			let authHeaders: Headers;
			if (headers instanceof Headers) {
				authHeaders = headers;
			} else {
				// If headers is a plain object, convert to Headers
				authHeaders = new Headers(headers as Record<string, string>);
			}

			const sessionData = await auth.api.getSession({ headers: authHeaders });
			if (!sessionData) {
				return { organizationId: null, userId: null };
			}

			// Get active organization from session
			const activeOrgId = sessionData.session?.activeOrganizationId;
			if (!activeOrgId) {
				return { organizationId: null, userId: sessionData.user.id };
			}

			return {
				organizationId: activeOrgId,
				userId: sessionData.user.id
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
				.get('/', async ({ organizationId, body }) => {
					console.log('Todo GET endpoint called');
					if (!organizationId) {
						return [];
					}

					let todoQuery = db
						.selectFrom('todo')
						.selectAll()
						.where('organization_id', '=', organizationId);

					// Apply filters if provided
					if (body && body.filters && body.filters.length > 0) {
						const normalizedFilters = body.filters.map((f, idx) => ({
							id: `req-${idx}`,
							field: f.field,
							operator: f.operator as any,
							value: f.value,
							type: f.type as any
						}));
						todoQuery = applyFilters(todoQuery, normalizedFilters as any);
					}

					const result = await todoQuery.execute();
					return result;
				},

					{
						body: t.Object({
							filters: t.Array(t.Object({
								field: t.String(),
								operator: t.String(),
								value: t.Any(),
								type: t.Union([
									t.Literal('text'),
									t.Literal('number'),
									t.Literal('date'),
									t.Literal('select'),
									t.Literal('multiselect'),
									t.Literal('boolean'),
									t.Literal('utm')
								])
							}))
						})
					}
				)

				.post(
					'/',
					async ({ body, organizationId }) => {
						console.log('Creating todo', body);
						if (!organizationId) {
							console.log('No organization selected');
							throw new Error('No organization selected');
						}
						return db
							.insertInto('todo')
							.values({
								text: body.text,
								completed: body.completed ?? false,
								priority: body.priority ?? 'medium',
								status: body.status ?? 'todo',
								label: body.label ?? 'feature',
								organization_id: organizationId,
								created_at: new Date(),
								updated_at: new Date()
							})
							.returningAll()
							.execute();
					},
					{
						body: t.Object({
							text: t.String(),
							completed: t.Optional(t.Boolean()),
							priority: t.Optional(
								t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high')])
							),
							status: t.Optional(
								t.Union([
									t.Literal('backlog'),
									t.Literal('todo'),
									t.Literal('in progress'),
									t.Literal('done'),
									t.Literal('canceled')
								])
							),
							label: t.Optional(
								t.Union([t.Literal('bug'), t.Literal('feature'), t.Literal('documentation')])
							)
						})
					}
				)

				.patch(
					'/toggle',
					async ({ body, organizationId }) => {
						if (!organizationId) {
							throw new Error('No organization selected');
						}
						return db
							.updateTable('todo')
							.set({
								completed: body.completed,
								updated_at: new Date()
							})
							.where('id', '=', body.id)
							.where('organization_id', '=', organizationId)
							.returningAll()
							.execute();
					},
					{
						body: t.Object({
							id: t.Number(),
							completed: t.Boolean()
						})
					}
				)

				.patch(
					'/:id',
					async ({ params: { id }, body, organizationId }) => {
						if (!organizationId) {
							throw new Error('No organization selected');
						}
						const updates: Record<string, unknown> = {};
						if (body.text !== undefined) updates.text = body.text;
						if (body.label !== undefined) updates.label = body.label;
						if (body.status !== undefined) updates.status = body.status;
						if (body.priority !== undefined) updates.priority = body.priority;
						if (body.completed !== undefined) updates.completed = body.completed;
						if (Object.keys(updates).length === 0) {
							throw new Error('No updates provided');
						}
						return db
							.updateTable('todo')
							.set({
								...updates,
								updated_at: new Date()
							})
							.where('id', '=', Number(id))
							.where('organization_id', '=', organizationId)
							.returningAll()
							.execute();
					},
					{
						body: t.Object({
							text: t.Optional(t.String()),
							label: t.Optional(
								t.Union([t.Literal('bug'), t.Literal('feature'), t.Literal('documentation')])
							),
							status: t.Optional(
								t.Union([
									t.Literal('backlog'),
									t.Literal('todo'),
									t.Literal('in progress'),
									t.Literal('done'),
									t.Literal('canceled')
								])
							),
							priority: t.Optional(
								t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high')])
							),
							completed: t.Optional(t.Boolean())
						})
					}
				)

				.delete('/:id', async ({ params: { id }, organizationId }) => {
					if (!organizationId) {
						throw new Error('No organization selected');
					}
					return db
						.deleteFrom('todo')
						.where('id', '=', Number(id))
						.where('organization_id', '=', organizationId)
						.returningAll()
						.execute();
				})

				.patch(
					'/bulk',
					async ({ body, organizationId }) => {
						if (!organizationId) {
							throw new Error('No organization selected');
						}
						const updates: Record<string, unknown> = {};
						if (body.updates.label !== undefined) updates.label = body.updates.label;
						if (body.updates.status !== undefined) updates.status = body.updates.status;
						if (body.updates.priority !== undefined) updates.priority = body.updates.priority;
						if (body.updates.completed !== undefined) updates.completed = body.updates.completed;
						if (Object.keys(updates).length === 0) {
							throw new Error('No updates provided');
						}
						return db
							.updateTable('todo')
							.set({
								...updates,
								updated_at: new Date()
							})
							.where('id', 'in', body.ids)
							.where('organization_id', '=', organizationId)
							.returningAll()
							.execute();
					},
					{
						body: t.Object({
							ids: t.Array(t.Number()),
							updates: t.Object({
								label: t.Optional(
									t.Union([t.Literal('bug'), t.Literal('feature'), t.Literal('documentation')])
								),
								status: t.Optional(
									t.Union([
										t.Literal('backlog'),
										t.Literal('todo'),
										t.Literal('in progress'),
										t.Literal('done'),
										t.Literal('canceled')
									])
								),
								priority: t.Optional(
									t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high')])
								),
								completed: t.Optional(t.Boolean())
							})
						})
					}
				)

				.delete(
					'/bulk',
					async ({ body, organizationId }) => {
						if (!organizationId) {
							throw new Error('No organization selected');
						}
						return db
							.deleteFrom('todo')
							.where('id', 'in', body.ids)
							.where('organization_id', '=', organizationId)
							.returningAll()
							.execute();
					},
					{
						body: t.Object({
							ids: t.Array(t.Number())
						})
					}
				)
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

					const [
						totalTodos,
						todosByStatus,
						todosByPriority,
						todosByLabel,
						completedTodos,
						inProgressTodos,
						highPriorityTodos
					] = await Promise.all([
						db
							.selectFrom('todo')
							.select(db.fn.count<number>('id').as('count'))
							.where('organization_id', '=', organizationId)
							.execute(),
						db
							.selectFrom('todo')
							.select(['status', db.fn.count<number>('id').as('count')])
							.where('organization_id', '=', organizationId)
							.groupBy('status')
							.execute(),
						db
							.selectFrom('todo')
							.select(['priority', db.fn.count<number>('id').as('count')])
							.where('organization_id', '=', organizationId)
							.groupBy('priority')
							.execute(),
						db
							.selectFrom('todo')
							.select(['label', db.fn.count<number>('id').as('count')])
							.where('organization_id', '=', organizationId)
							.groupBy('label')
							.execute(),
						db
							.selectFrom('todo')
							.select(db.fn.count<number>('id').as('count'))
							.where('organization_id', '=', organizationId)
							.where('status', '=', 'done')
							.execute(),
						db
							.selectFrom('todo')
							.select(db.fn.count<number>('id').as('count'))
							.where('organization_id', '=', organizationId)
							.where('status', '=', 'in progress')
							.execute(),
						db
							.selectFrom('todo')
							.select(db.fn.count<number>('id').as('count'))
							.where('organization_id', '=', organizationId)
							.where('priority', '=', 'high')
							.where('status', '=', 'todo')
							.execute()
					]);

					const totalCount = Number(totalTodos[0]?.count) || 0;
					const completedCount = Number(completedTodos[0]?.count) || 0;
					const completionRate = totalCount
						? Math.round((completedCount / totalCount) * 1000) / 10
						: 0;

					function toDict<
						R extends Record<string, unknown> & { count: number },
						K extends keyof R & string
					>(rows: R[], key: K): Record<string, number> {
						const acc: Record<string, number> = {};
						for (const r of rows) {
							const k = r[key];
							if (typeof k === 'string') acc[k] = Number(r.count) || 0;
						}
						return acc;
					}

					return {
						totalTodos: totalCount,
						completedTodos: completedCount,
						inProgressTodos: Number(inProgressTodos[0]?.count) || 0,
						highPriorityTodos: Number(highPriorityTodos[0]?.count) || 0,
						completionRate,
						todosByStatus: toDict(todosByStatus, 'status'),
						todosByPriority: toDict(todosByPriority, 'priority'),
						todosByLabel: toDict(todosByLabel, 'label')
					};
				})

				.get('/activity', async ({ organizationId }) => {
					if (!organizationId) {
						return [];
					}
					// build dense 30-day window
					const end = new Date();
					const start = new Date(end);
					start.setHours(0, 0, 0, 0);
					start.setDate(start.getDate() - 29);
					const keyOf = (d: Date) => d.toISOString().slice(0, 10);
					const dayMap = new Map<
						string,
						{ date: Date; created: number; completed: number; inProgress: number; total: number }
					>();
					for (let i = 0; i < 30; i++) {
						const d = new Date(start);
						d.setDate(start.getDate() + i);
						dayMap.set(keyOf(d), { date: d, created: 0, completed: 0, inProgress: 0, total: 0 });
					}

					const [createdActivity, updatedActivity] = await Promise.all([
						db
							.selectFrom('todo')
							.select(['created_at as date', 'status', db.fn.count<number>('id').as('count')])
							.where('organization_id', '=', organizationId)
							.where('created_at', '>=', start)
							.groupBy(['created_at', 'status'])
							.orderBy('created_at')
							.execute(),
						db
							.selectFrom('todo')
							.select(['updated_at as date', 'status', db.fn.count<number>('id').as('count')])
							.where('organization_id', '=', organizationId)
							.where('updated_at', '>=', start)
							.groupBy(['updated_at', 'status'])
							.orderBy('updated_at')
							.execute()
					]);

					for (const item of createdActivity) {
						if (!item.date) continue;
						const day = dayMap.get(keyOf(item.date));
						if (!day) continue;
						const n = Number(item.count) || 0;
						day.created += n;
						day.total += n;
					}

					for (const item of updatedActivity) {
						if (!item.date) continue;
						const day = dayMap.get(keyOf(item.date));
						if (!day) continue;
						const n = Number(item.count) || 0;
						if (item.status === 'done') day.completed += n;
						else if (item.status === 'in progress') day.inProgress += n;
					}

					return Array.from(dayMap.values());
				})
		);
