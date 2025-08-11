import type { DB } from '$lib/server/db/db.types';
import { KyselyPGlite } from 'kysely-pglite';
import { treaty } from '@elysiajs/eden';
import { Kysely, sql } from 'kysely';
import { createTestElysiaApp } from './elysia.test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const createTestDb = async () => {
	console.time('time to create the pglite database');

	// Note: This test setup uses schema.sql directly for table creation.
	// In production, use Atlas migrations (bun run db:migrate) followed by
	// type regeneration (bun run gentypes) to keep TypeScript types in sync.

	// Create PGlite instance with Kysely dialect
	const { dialect, client } = await KyselyPGlite.create();
	const db = new Kysely<DB>({ dialect });

	// Read and execute schema.sql to create tables
	const schemaPath = path.join(process.cwd(), 'schema.sql');
	const schemaSql = readFileSync(schemaPath, 'utf-8');

	// Split by semicolon and execute each statement
	const statements = schemaSql
		.split(';')
		.map((stmt) => stmt.trim())
		.filter((stmt) => stmt.length > 0);

	for (const statement of statements) {
		await sql.raw(statement).execute(db);
	}

	// Create test organization for tests
	await db
		.insertInto('organization')
		.values({
			id: 'test-org-id',
			name: 'Test Organization',
			slug: 'test-org',
			createdAt: new Date()
		})
		.execute();

	const cleanup = () => {
		client.close();
	};

	console.timeEnd('time to create the pglite database');
	return { db, cleanup };
};

export const createElysiaEdenTestApp = async () => {
	const { db, cleanup } = await createTestDb();
	const testElysiaApp = createTestElysiaApp(db);
	const eden = treaty(testElysiaApp);
	return { eden, cleanup, db };
};
