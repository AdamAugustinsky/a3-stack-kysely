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
	const { dialect, client } = await KyselyPGlite.create();
	const db = new Kysely<DB>({ dialect });

	// Execute schema.sql to create tables
	const schemaPath = path.join(process.cwd(), 'schema.sql');
	const schemaSql = readFileSync(schemaPath, 'utf-8');

	const statements = schemaSql
		.split(';')
		.map((stmt) => stmt.trim())
		.filter((stmt) => stmt.length > 0);

	for (const statement of statements) {
		await sql.raw(statement).execute(db);
	}

	return {
		db,
		cleanup: () => client.close()
	};
};

export const createElysiaEdenTestApp = async () => {
	const { db, cleanup } = await createTestDb();

	// Setup auth for tests
	const auth = betterAuth({
		database: { type: 'postgres', db },
		emailAndPassword: { enabled: true },
		plugins: [organization()]
	});

	const testElysiaApp = createElysiaApp(db, auth);

	// Create test user
	const testUser = {
		email: 'test@example.com',
		password: 'testpassword123',
		name: 'Test User'
	};

	// Sign up and sign in
	const signupResult = await auth.api.signUpEmail({ body: testUser });
	if (!signupResult?.user) {
		throw new Error('Failed to create test user');
	}

	const signinResult = await auth.api.signInEmail({
		body: { email: testUser.email, password: testUser.password },
		asResponse: true
	});

	if (signinResult.status !== 200) {
		throw new Error(`Failed to sign in test user: ${signinResult.status}`);
	}

	// Get session cookie
	const setCookieHeader = signinResult.headers.get('set-cookie');
	if (!setCookieHeader) {
		throw new Error('No session cookie returned from sign in');
	}

	const sessionCookie = setCookieHeader.split(';')[0];
	const headers = new Headers({ cookie: sessionCookie });

	// Create and set organization
	const orgResult = await auth.api.createOrganization({
		body: { name: 'Test Organization', slug: 'test-org' },
		headers
	});

	if (!orgResult?.id) {
		throw new Error('Failed to create test organization');
	}

	await auth.api.setActiveOrganization({
		body: { organizationId: orgResult.id },
		headers
	});

	// Create authenticated Eden client
	const authenticatedEden = treaty(testElysiaApp, {
		headers: { cookie: sessionCookie }
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
