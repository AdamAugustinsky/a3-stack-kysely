import { Elysia } from 'elysia';
import { createAuth } from './auth';
import type { Kysely } from 'kysely';
import type { DB } from './db/db.types';
import { applyFilters } from '@/utils/kysely-filter-builder';
import * as v from 'valibot';
import { filterSchema } from '@/utils/filter';

const nameBody = v.object({
	name: v.string()
});

const createTodoBody = v.object({
	text: v.string(),
	completed: v.optional(v.boolean()),
	priority: v.optional(v.union([v.literal('low'), v.literal('medium'), v.literal('high')])),
	status: v.optional(
		v.union([
			v.literal('backlog'),
			v.literal('todo'),
			v.literal('in progress'),
			v.literal('done'),
			v.literal('canceled')
		])
	),
	label: v.optional(v.union([v.literal('bug'), v.literal('feature'), v.literal('documentation')]))
});

const toggleTodoBody = v.object({
	id: v.number(),
	completed: v.boolean()
});

const updateTodoBody = v.object({
	text: v.optional(v.string()),
	label: v.optional(v.union([v.literal('bug'), v.literal('feature'), v.literal('documentation')])),
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
	completed: v.optional(v.boolean())
});

const bulkUpdateBody = v.object({
	ids: v.array(v.number()),
	updates: v.object({
		label: v.optional(
			v.union([v.literal('bug'), v.literal('feature'), v.literal('documentation')])
		),
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
		completed: v.optional(v.boolean())
	})
});

const bulkDeleteBody = v.object({
	ids: v.array(v.number())
});

class UnauthorizedError extends Error {
	status = 401;
	constructor(public message: string) {
		super(message);
	}
}

export const createElysiaApp = (db: Kysely<DB>, auth: ReturnType<typeof createAuth>) =>
	new Elysia({ prefix: '/api' })
		// Derive organization from session for all routes
		.get('/', () => 'hi')
		.post('/', ({ body }) => body, {
			body: nameBody
		})
		.group('/org/:organizationSlug', (app) =>
			app
				.derive({ as: 'scoped' }, async ({ headers, params }) => {
					const authHeaders = new Headers(headers as HeadersInit);

					console.log({ authHeaders });

					const { organizationSlug } = params;

					const organization = await auth.api.getFullOrganization({
						headers: authHeaders,
						query: { organizationSlug }
					});

					if (!organization) {
						console.log({ error: 'Organization not found or access denied' });
						throw new UnauthorizedError('Organization not found or access denied');
					}

					console.log({ organization });

					return {
						organizationId: organization.id,
						organizationSlug: organization.slug,
						organization: organization
					};
				})
				.group('/todo', (app) =>
					app
						.get('/', async ({ organizationId, query }) => {
							console.log('Todo GET endpoint called');
							if (!organizationId) {
								return [];
							}

							let todoQuery = db
								.selectFrom('todo')
								.selectAll()
								.where('organization_id', '=', organizationId);

							// Apply filters if provided
							if (query.filters) {
								try {
									const parsedFilters = JSON.parse(query.filters);
									// Validate the filters using Valibot
									const validatedFilters = v.parse(v.array(filterSchema), parsedFilters);
									if (validatedFilters && validatedFilters.length > 0) {
										todoQuery = applyFilters(todoQuery, validatedFilters);
									}
								} catch (error) {
									console.warn('Failed to parse or validate filters:', error);
									// Continue without filters if parsing/validation fails
								}
							}

							const result = await todoQuery.execute();
							return result;
						})
						.post(
							'/',
							async ({ body, organizationId }) => {
								console.log('Creating todo', body);
								if (!organizationId) {
									console.log('No organization selected');
									throw new UnauthorizedError('No organization selected');
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
								body: createTodoBody
							}
						)

						.patch(
							'/toggle',
							async ({ body, organizationId }) => {
								if (!organizationId) {
									throw new UnauthorizedError('No organization selected');
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
								body: toggleTodoBody
							}
						)

						.patch(
							'/:id',
							async ({ params: { id }, body, organizationId }) => {
								if (!organizationId) {
									throw new UnauthorizedError('No organization selected');
								}
								const updates: Record<string, unknown> = {};
								if (body.text !== undefined) updates.text = body.text;
								if (body.label !== undefined) updates.label = body.label;
								if (body.status !== undefined) updates.status = body.status;
								if (body.priority !== undefined) updates.priority = body.priority;
								if (body.completed !== undefined) updates.completed = body.completed;
								if (Object.keys(updates).length === 0) {
									throw new UnauthorizedError('No updates provided');
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
								body: updateTodoBody
							}
						)

						.delete('/:id', async ({ params: { id }, organizationId }) => {
							if (!organizationId) {
								throw new UnauthorizedError('No organization selected');
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
									throw new UnauthorizedError('No organization selected');
								}
								const updates: Record<string, unknown> = {};
								if (body.updates.label !== undefined) updates.label = body.updates.label;
								if (body.updates.status !== undefined) updates.status = body.updates.status;
								if (body.updates.priority !== undefined) updates.priority = body.updates.priority;
								if (body.updates.completed !== undefined)
									updates.completed = body.updates.completed;
								if (Object.keys(updates).length === 0) {
									throw new UnauthorizedError('No updates provided');
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
								body: bulkUpdateBody
							}
						)

						.delete(
							'/bulk',
							async ({ body, organizationId }) => {
								if (!organizationId) {
									throw new UnauthorizedError('No organization selected');
								}
								return db
									.deleteFrom('todo')
									.where('id', 'in', body.ids)
									.where('organization_id', '=', organizationId)
									.returningAll()
									.execute();
							},
							{
								body: bulkDeleteBody
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
								{
									date: Date;
									created: number;
									completed: number;
									inProgress: number;
									total: number;
								}
							>();
							for (let i = 0; i < 30; i++) {
								const d = new Date(start);
								d.setDate(start.getDate() + i);
								dayMap.set(keyOf(d), {
									date: d,
									created: 0,
									completed: 0,
									inProgress: 0,
									total: 0
								});
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
				)
		);
