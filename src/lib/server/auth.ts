import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { organization } from 'better-auth/plugins';
import { getRequestEvent } from '$app/server';
import type { Kysely } from 'kysely';
import type { DB } from './db/db.types';
import { db } from './db';

export const createAuth = (db: Kysely<DB>) =>
	betterAuth({
		database: {
			type: 'postgres',
			db
		},
		emailAndPassword: {
			enabled: true
		},
		plugins: [sveltekitCookies(getRequestEvent), organization()]
	});

export const auth = createAuth(db);
