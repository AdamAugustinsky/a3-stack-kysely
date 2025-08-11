# A3 Stack Svelte - AI Documentation

## Project Overview

This is a modern full-stack web application built with the **A3 Stack**:

- **SvelteKit 5** - Full-stack framework with experimental features
- **Better Auth** - Modern authentication library
- **Kysely** - Type-safe SQL query builder
- **PostgreSQL** - Primary database
- **shadcn/ui (Svelte)** - UI component library
- **TailwindCSS v4** - Utility-first CSS framework

## Key Technologies & Features

### Core Stack

- **SvelteKit 2.27+** with experimental remote functions and async compiler
- **Svelte 5** with runes and modern reactive patterns -- MAKE SURE TO ALWAYS USE SVELTE 5 SYNTAX.
- **TypeScript** with strict configuration
- **Vite 7** through rolldown(rust rewrite) for fast builds and development
- **Bun** as package manager (bun.lock present)

### Authentication System

- **Better Auth 1.3+** with PostgreSQL adapter
- Email/password authentication
- Session management with PostgreSQL
- Authentication is always handled in the server through either Elysia or Sveltekit server actions/hooks/remote functions.

### Database & Query Builder

- **PostgreSQL** with Docker Compose setup
- **Kysely** type-safe SQL query builder
- **Atlas** for database schema migrations
- **kysely-codegen** for TypeScript type generation
- **⚠️ CRITICAL**: Always run `bun run gentypes` after any schema changes
- Type-safe database queries and operations

### UI & Styling

- **shadcn/ui for Svelte** - Complete component library
- **TailwindCSS v4** with Vite plugin integration
- **Lucide icons** for consistent iconography
- Mobile-responsive design patterns

### Development Tools

- **ESLint** with TypeScript and Svelte plugins
- **Prettier** with Svelte and TailwindCSS plugins
- **TypeScript** with strict checking enabled
- **Atlas** for database migrations
- **kysely-codegen** for database type generation
- **⚠️ CRITICAL**: Always run `bun run gentypes` after any schema changes

## Project Structure

```
src/
├── lib/
│   ├── components/ui/        # shadcn/ui components (extensive library)
│   ├── server/
│   │   ├── auth.ts          # Better Auth configuration
│   │   └── db/
│   │       ├── index.ts     # Database connection
│   │       └── db.types.ts  # Generated Kysely database types
│   ├── schemas/              # Valibot validation schemas
│   └── utils.ts             # Utility functions
├── routes/
│   ├── auth.remote.ts       # Remote functions for auth
│   ├── sign-in/
│   │   └── +page.svelte     # Sign in page
│   └── sign-up/
│       └── +page.svelte     # Sign up page
└── hooks.server.ts          # Server-side hooks
```

## Remote Functions Implementation

This project uses **SvelteKit Remote Functions** (experimental feature in 2.27+) as the primary way of interaction with the server, providing type-safe server-client communication. Remote functions allow you to call server-side code from anywhere in your app while maintaining type safety.

### Configuration

Remote functions are enabled in `svelte.config.js`:

```javascript
kit: {
  experimental: {
    remoteFunctions: true
  }
},
compilerOptions: {
  experimental: {
    async: true
  }
}
```

### Types of Remote Functions

#### 1. Form Functions

Used for handling form submissions with progressive enhancement. Always receive raw FormData.

```typescript
import { form } from '$app/server';
import { error, redirect } from '@sveltejs/kit';

export const createPost = form(async (data) => {
	const title = data.get('title');
	const content = data.get('content');

	// Manual validation required
	if (typeof title !== 'string' || typeof content !== 'string') {
		error(400, 'Title and content are required');
	}

	// Database operation
	await db.sql`
    INSERT INTO post (slug, title, content)
    VALUES (${slug}, ${title}, ${content})
  `;

	redirect(303, `/blog/${slug}`);
});
```

Usage in component:

```svelte
<form
	{...createPost.enhance(async ({ submit }) => {
		// Handle loading/errors
	})}
>
	<input name="title" />
	<textarea name="content"></textarea>
</form>
```

#### 2. Query Functions

For reading dynamic data from the server. Can accept typed arguments with automatic validation.

```typescript
import { query } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

// Simple query without arguments
export const getPosts = query(async () => {
	const posts = await db.sql`
    SELECT title, slug, published_at
    FROM post
    ORDER BY published_at DESC
  `;
	return posts;
});

// With Valibot validation

const getPostSchema = v.object({
	slug: v.pipe(v.string(), v.minLength(1))
});

export const getPost = query(getPostSchema, async ({ slug }) => {
	const post = await db.getPost(slug);
	if (!post) error(404, 'Post not found');
	return post;
});

// More complex validation with Valibot
const searchPostsSchema = v.object({
	query: v.pipe(v.string(), v.minLength(1)),
	limit: v.pipe(v.number(), v.minValue(1), v.maxValue(100)),
	offset: v.pipe(v.number(), v.minValue(0)),
	category: v.optional(v.string())
});

export const searchPosts = query(searchPostsSchema, async ({ query, limit, offset, category }) => {
	// Input is automatically validated and typed
	return await db.searchPosts({ query, limit, offset, category });
});
```

Usage in component:

```svelte
<script lang="ts">
	import { getPosts } from './data.remote';

	const query = getPosts();
</script>

{#if query.error}
	<p>oops!</p>
{:else if query.loading}
	<p>loading...</p>
{:else}
	<ul>
		{#each query.current as { title, slug }}
			<li><a href="/blog/{slug}">{title}</a></li>
		{/each}
	</ul>
{/if}
```

#### 3. Command Functions

For write operations that can be called from anywhere. Supports Valibot validation.
Commands are the equivalents of POSTS to an API, we should only use it when forms are not the right solution for the problem, but forms should be our preferred solution.

```typescript
import { command } from '$app/server';
import * as v from 'valibot';
import { error } from '@sveltejs/kit';

// Simple command with Valibot validation
const likeSchema = v.object({
	postId: v.pipe(v.string(), v.minLength(1))
});

export const incrementLikes = command(likeSchema, async ({ postId }) => {
	const result = await db.sql`
      UPDATE post
      SET likes = likes + 1
      WHERE id = ${postId}
      RETURNING likes
    `;

	if (!result.length) {
		error(404, 'Post not found');
	}

	// Optionally refresh related queries
	getPosts.refresh();

	return { likes: result[0].likes };
});

// More complex example with nested validation
const updateProfileSchema = v.object({
	userId: v.pipe(v.string(), v.minLength(1)),
	profile: v.object({
		name: v.pipe(v.string(), v.minLength(2), v.maxLength(100)),
		bio: v.optional(v.pipe(v.string(), v.maxLength(500))),
		email: v.pipe(v.string(), v.email()),
		age: v.optional(v.pipe(v.number(), v.minValue(13), v.maxValue(120)))
	})
});

export const updateProfile = command(updateProfileSchema, async ({ userId, profile }) => {
	// Input is automatically validated and typed
	const user = await auth.getUser(userId);
	if (!user) error(404, 'User not found');

	await db.updateUser(userId, profile);

	// Refresh user queries
	getUser.refresh({ userId });
});
```

Usage in component:

```svelte
<script>
	import { incrementLikes, updateProfile } from './data.remote';

	async function handleLike(postId: string) {
		try {
			const result = await incrementLikes({ postId });
			console.log('New like count:', result.likes);
		} catch (error) {
			console.error('Failed to like post:', error);
		}
	}

	async function saveProfile() {
		try {
			await updateProfile({
				userId: currentUser.id,
				profile: {
					name: userName,
					email: userEmail,
					bio: userBio,
					age: userAge
				}
			});
		} catch (error) {
			// Validation errors are automatically handled
			console.error('Profile update failed:', error);
		}
	}
</script>

<button onclick={() => handleLike(post.id)}>
	Like ({post.likes})
</button>
```

#### 4. Prerender Functions

For generating static data at build time.

```typescript
import { prerender } from '$app/server';

export const getStaticPosts = prerender(
	async () => {
		const posts = await db.sql`
    SELECT title, slug
    FROM post
    WHERE published = true
  `;
		return posts;
	},
	{
		// Specify which pages to prerender
		inputs: () => [{ slug: 'first-post' }, { slug: 'second-post' }]
	}
);
```

### Current Implementation: Auth Remote Functions

This project currently uses form functions for authentication (`src/routes/auth.remote.ts`):

- `signin(data: FormData)` - Email/password sign in
- `signup(data: FormData)` - User registration
- Manual FormData validation (no automatic schema validation)
- Proper error handling with HTTP status codes
- Uses `error()` and `redirect()` from SvelteKit

### Key Differences from Traditional Actions

1. **Import Location**: Remote functions import from `$app/server`, not `@sveltejs/kit`
2. **Validation**: Form functions receive raw FormData, not validated inputs
3. **Error Handling**: Use `error()` function instead of returning fail objects
4. **Redirects**: Use `redirect()` function instead of returning redirect objects
5. **Type Safety**: Full TypeScript support across client-server boundary

### Enhanced Form Pattern (Current Usage)

```svelte
<script>
	import { signin } from '../auth.remote';
	import { isHttpError } from '@sveltejs/kit';

	let errorValue = $state<string | undefined>();
	let loading = $state(false);
</script>

<form
	{...signin.enhance(async ({ submit }) => {
		errorValue = undefined;
		loading = true;

		try {
			await submit();
			// Success - redirects handled automatically
		} catch (error) {
			if (isHttpError(error)) {
				errorValue = error.body.message;
			} else {
				errorValue = 'An unexpected error occurred';
			}
		} finally {
			loading = false;
		}
	})}
>
	<!-- form fields with disabled={loading} -->
</form>
```

### Validation with Valibot

This project uses Valibot for runtime validation. Query and command functions support automatic validation:

```typescript
import * as v from 'valibot';

// Basic types
const userIdSchema = v.pipe(v.string(), v.minLength(1));
const emailSchema = v.pipe(v.string(), v.email());
const ageSchema = v.pipe(v.number(), v.minValue(13), v.maxValue(120));

// Complex object validation
const userSchema = v.object({
	name: v.pipe(v.string(), v.minLength(2), v.maxLength(100)),
	email: v.pipe(v.string(), v.email()),
	password: v.pipe(v.string(), v.minLength(8)),
	age: v.optional(v.pipe(v.number(), v.minValue(13), v.maxValue(120))),
	tags: v.pipe(v.array(v.string()), v.maxLength(10)) // Array with max 10 items
});

// Union types
const statusSchema = v.union([v.literal('active'), v.literal('inactive'), v.literal('pending')]);

// Nested objects
const postSchema = v.object({
	title: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
	content: v.pipe(v.string(), v.minLength(1)),
	author: v.object({
		id: v.pipe(v.string(), v.minLength(1)),
		name: v.string()
	}),
	tags: v.array(v.string()),
	published: v.boolean(),
	publishedAt: v.optional(v.date())
});
```

**Important**: Form functions do NOT support automatic validation — use Valibot to validate FormData:

````typescript
import { form } from '$app/server';
import { error } from '@sveltejs/kit';
import * as v from 'valibot';

// Define a schema for your form
const createPostSchema = v.object({
	title: v.pipe(v.string(), v.minLength(1, 'Title is required')),
	content: v.pipe(v.string(), v.minLength(1, 'Content is required'))
});

export const createPost = form(async (data) => {
	// Validate with Valibot
	const result = v.safeParse(createPostSchema, Object.fromEntries(data.entries()));

	if (!result.success) {
		// Collect the first error message or provide a generic one
		const message =
			result.issues?.[0]?.message ?? 'Invalid form submission';
		error(400, message);
	}

	const { title, content } = result.output;

});

### Best Practices

1. **Validation**:
   - Use Valibot schemas for query/command functions through the native support, and in the code itself for form validations.
   - Define reusable schemas in separate files
2. **Error Messages**: Use descriptive error messages with appropriate HTTP status codes
3. **Loading States**: Implement loading/disabled states for better UX
4. **Type Safety**:
   - Use `isHttpError` for proper error typing
   - Valibot provides automatic TypeScript types via `v.InferOutput`
5. **Organization**:
   - Group related remote functions in single files (e.g., `auth.remote.ts`)
   - Keep validation schemas close to their usage

## Database Setup & Management

> **⚠️ CRITICAL DATABASE WORKFLOW**
> 
> After ANY schema changes via Atlas migrations, you MUST run:
> ```bash
> bun run gentypes
> ```
> 
> This regenerates TypeScript types from the live database schema. Skipping this step will cause:
> - TypeScript compilation errors
> - Runtime type mismatches  
> - Broken database operations
> - Missing table/column definitions

### Local Development

1. **Start PostgreSQL**: `bun run db:start` (Docker Compose)
2. **Run Atlas migrations**: `bun run db:migrate`
3. **Generate TypeScript types**: `bun run gentypes` (**REQUIRED after migrations**)
4. **Complete setup**: `bun run db:setup` (runs migrations + type generation)

### Schema Overview

- **user**: Core user data with email verification
- **session**: Session management with expiration
- **account**: OAuth and password account data
- **verification**: Email verification tokens
- **organization**: Multi-tenant organization data
- **member**: Organization membership with roles
- **invitation**: Organization invitations
- **todo**: Application-specific todo items

### Migration Management

The project uses **Atlas** for database schema migrations:

- Migration files are stored in the `migrations/` directory
- Each migration is a SQL file with Atlas-generated checksums
- Run migrations with: `bun run db:migrate`
- **Important**: Always run `bun run gentypes` after applying migrations to regenerate TypeScript types

### Type Generation

The project uses `kysely-codegen` to generate TypeScript types from the live database schema:

```bash
bun run gentypes
```

This creates `src/lib/server/db/db.types.ts` with complete type definitions for all tables, ensuring compile-time type safety for all database operations.

**⚠️ CRITICAL**: After running Atlas migrations, you MUST regenerate types to keep them in sync with the database schema:

```bash
bun run gentypes
```

**The types are generated from the live database schema, so any schema changes require type regeneration for proper TypeScript support.**

**Failure to regenerate types after migrations will result in:**
- TypeScript compilation errors
- Runtime type mismatches
- Missing or incorrect table/column definitions
- Broken database operations

### Atlas Migration Workflow

1. **Check current status**: `bun run db:migrate:status`
2. **Generate new migration**: `bun run db:migrate:diff migration_name`
3. **Apply migrations**: `bun run db:migrate`
4. **Regenerate types**: `bun run gentypes` (REQUIRED after schema changes)

**Complete workflow**: `bun run db:setup` (applies migrations + regenerates types)

Always test migrations on development database before applying to production.

## Development Commands

### Primary Commands

- `bun run dev` - Start development server
- `bun run build` - Production build
- `bun run preview` - Preview production build
- `bun run check` - Type checking
- `bun run lint` - ESLint and Prettier checks
- `bun run format` - Format code with Prettier

### Database Commands

- `bun run db:start` - Start PostgreSQL container
- `bun run db:migrate` - Apply Atlas migrations
- `bun run db:migrate:status` - Check migration status
- `bun run db:migrate:diff` - Generate new migration
- `bun run gentypes` - **Generate TypeScript types from database schema (REQUIRED after migrations)**
- `bun run db:setup` - Complete setup (migrate + generate types)

## Authentication Flow

### Better Auth Integration

- Server-side configuration in `src/lib/server/auth.ts`
- Email/password provider enabled
- PostgreSQL adapter for session storage
- Type-safe database operations through Kysely

## Component Library

### shadcn/ui Components Available at $lib/components/ui

### Component Usage

```svelte
import {Button} from '$lib/components/ui/button';
import * as Card from "$lib/components/ui/card/index.js";
````

### Keyboard Shortcut Indicators (Kbd)

- Use the shared `Kbd` component for all inline keyboard hints across the app.
- Location: `src/lib/components/kbd.svelte`
- Purpose: Standardizes appearance and spacing for hints like `/`, `⌘` + `K`, etc.
- Example usage:

```svelte
<Kbd content="/" />
<div class="flex gap-0.5">
	<Kbd content="⌘" />
	<Kbd content="K" />
	<!-- Or platform-aware: 'Ctrl' + 'K' on non-mac -->
</div>
<!-- On primary buttons / colored surfaces -->
<Kbd content="C" variant="onPrimary" />
```

Design notes:

- Unified style: subtle border, background with slight translucency, compact height, tiny type, slight shadow for contrast.
- Do not render raw `<kbd>` directly; always use `Kbd` for consistency.
- For positioning inside inputs, absolutely position `Kbd` and add right padding to the input so text does not overlap.
- Use `variant="onPrimary"` when placing inside primary buttons or colored surfaces so the hint has correct contrast.

### Path Aliases

- `@/*` → `./src/lib/*` (configured in svelte.config.js)
- `@routes/*` → `./src/routes/*` (configured in svelte.config.js)
- `$lib/*` → `./src/lib/*` (SvelteKit default)

## Architecture Decisions

### Why Remote Functions?

- Type-safe server-client communication
- Simplified data flow compared to form actions
- Better integration with modern Svelte patterns
- Experimental feature showcasing SvelteKit's future

### Why Better Auth?

- Modern authentication library with great TypeScript support
- Better session management than traditional solutions
- Excellent PostgreSQL integration
- Built for modern frameworks like SvelteKit

### Why This UI Stack?

- **shadcn/ui**: Industry standard component library
- **TailwindCSS v4**: Latest utilities with better performance
- **Lucide Icons**: Consistent and modern iconography
- **Mobile-first**: Responsive design from the ground up

This project demonstrates modern full-stack development patterns with SvelteKit, showcasing experimental features and best practices for authentication, database management, and user interface development.

## Design Principles

These principles capture patterns and decisions we solidified while designing the Account page and should guide future UI work across the app.

1. Text overflow and truncation

- Always guard long user-provided strings (names, emails, IDs) with truncation and min-width containers.
- Use a combination of: parent container with min-w-0, child text with truncate, and icons with shrink-0 to prevent layout jitter.
- Apply whitespace-nowrap only to short helper labels to avoid wrapping, not to primary content.

2. Spacing rhythm to avoid micro-scroll

- Prefer small, consistent paddings across container → grid → card header/content → row paddings to avoid cumulative overflow.
- Use tighter paddings where density is desired: pb-1 on headers, py-1 on list rows, and space-y-2/3 for compact sections.
- Avoid bottom-most margin stacking that causes 2–8px accidental scroll.

3. Responsive grid structure

- Use a simple two-column grid for settings pages: main editor (2/3) and meta/actions (1/3).
- Ensure mobile-first: stack to a single column, rely on min-w-0 and truncate to keep content readable.

4. Inline feedback and micro-interactions

- Show lightweight inline alerts for success/error (with icons) near the header of the page or above the edited section.
- Use short-lived success messages (e.g., after copy) that auto-clear.
- Keep the destructive section visually distinct and isolated.

5. Skeletons and perceived performance

- Optional skeletons are helpful; keep them minimal and consistent in size with final content to avoid layout shift.
- Toggle them only for longer async operations.

6. Controls and actions

- Place primary context actions (e.g., Edit Profile) in predictable locations: page header or section header.
- Prefer compact buttons for secondary actions in dense areas (e.g., Copy beside User ID).

7. Simplicity and consistency

- Favor minimal, obvious class changes over custom CSS whenever possible.
- Avoid over-abstraction; prefer local, obvious helpers and straightforward composition.

## Code Preferences

The following preferences guide how we write and maintain code in this repository, inferred from recent changes and aligned with our Simplicity philosophy:

1. Simplicity and Minimalism
   - Inline simple logic rather than creating helpers that add indirection without clear value.
   - Avoid abstractions that obscure behavior or reduce type inference.
   - Endpoints should be straightforward: validate input, perform database operations, return results.

2. TypeScript Strictness
   - Prefer precise union types for UI state (e.g., '30d' | '14d' | '7d').
   - Use Record<Union, T> for constant maps to avoid unsafe indexing and fallbacks.
   - Eliminate any and ts-expect-error; use small, local generics only when they materially improve clarity.

3. Data Integrity for Charts/APIs
   - APIs should return dense, normalized, zero-safe time series (no NaNs/undefined).
   - Backend is responsible for consistent data; frontend still normalizes defensively (Date and number coercion).

4. Real Data Over Mocks
   - Replace mocked or simulated data with real database-backed computations.
   - Add schema fields (e.g., created_at, updated_at) to support analytics rather than generating synthetic series.

5. Validation and Security
   - Keep validation at the route level and close to usage.
   - Server controls sensitive fields like timestamps; never trust client-provided timestamps.
   - Use parameterized ORM operations; avoid dynamic SQL.

6. Code Style and Organization
   - Prefer concise, readable endpoints with obvious side effects.
   - Use tiny, local helpers only when they clearly reduce duplication and remain obvious.
   - Avoid classes; design functions as data-in/data-out pipelines.

7. Developer Ergonomics
   - Favor code that’s easy to scan and understand locally without searching for helpers.
   - Remove code and abstractions unless they demonstrate clear payoff in reuse or complexity reduction.

8. Testing Approach
   - Keep data shaping as pure functions where feasible, making it easy to test deterministically.
   - Limit side effects to boundaries (DB/HTTP). If tests require side effects, use created services.
