import { KyselyPGlite } from 'kysely-pglite';
import { treaty } from '@elysiajs/eden';
import { Kysely, sql } from 'kysely';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElysiaApp } from './elysia';
import { organization } from 'better-auth/plugins';
import { betterAuth } from 'better-auth';
import type { DB } from './db/db.types';

export const createTestDb = async () => {
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

	return { db, cleanup };
};

export const createElysiaEdenTestApp = async () => {
	const { db, cleanup } = await createTestDb();

	// Create auth without sveltekitCookies plugin for tests
	const auth = betterAuth({
		database: {
			type: 'postgres',
			db
		},
		emailAndPassword: {
			enabled: true
		},
		plugins: [organization()]
	});

	const testElysiaApp = createElysiaApp(db, auth);

	// Create test user and organization
	const testUser = {
		email: 'test@example.com',
		password: 'testpassword123',
		name: 'Test User'
	};

	// Sign up the user - this creates the user account
	const signupResult = await auth.api.signUpEmail({
		body: {
			email: testUser.email,
			password: testUser.password,
			name: testUser.name
		}
	});

	if (!signupResult?.user) {
		throw new Error('Failed to create test user');
	}

	// Sign in to get a session with proper headers
	const signinResult = await auth.api.signInEmail({
		body: {
			email: testUser.email,
			password: testUser.password
		},
		asResponse: true
	});

	if (signinResult.status !== 200) {
		throw new Error(`Failed to sign in test user: ${signinResult.status}`);
	}

	// Extract the session cookie from the response headers
	const setCookieHeader = signinResult.headers.get('set-cookie');
	if (!setCookieHeader) {
		throw new Error('No session cookie returned from sign in');
	}

	// Parse the session cookie
	const sessionCookie = setCookieHeader.split(';')[0];
	const headers = new Headers({
		cookie: sessionCookie
	});

	// Create an organization for the user
	const orgResult = await auth.api.createOrganization({
		body: {
			name: 'Test Organization',
			slug: 'test-org-new'
		},
		headers
	});

	if (!orgResult?.id) {
		console.error('Organization creation failed:', JSON.stringify(orgResult, null, 2));
		throw new Error('Failed to create test organization');
	}

	// Set the active organization in the session
	await auth.api.setActiveOrganization({
		body: {
			organizationId: orgResult.id
		},
		headers
	});

	// Create authenticated eden client with session headers
	const authenticatedEden = treaty(testElysiaApp, {
		headers: {
			cookie: sessionCookie
		}
	});

	return {
		eden: authenticatedEden,
		cleanup,
		db,
		auth,
		testUser,
		organizationId: orgResult.id
	};
};
