import type { DB } from './db.types';
import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { env } from '$env/dynamic/private';

const dialect = new PostgresDialect({
	pool: new Pool({
		connectionString: env.DATABASE_URL
	})
});

export const db = new Kysely<DB>({
	dialect
});
