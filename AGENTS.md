# A3 Stack Svelte - AI Documentation

## Project Overview

This is a modern full-stack web application built with the **A3 Stack**:

- **SvelteKit 5** - Full-stack framework with experimental features
- **Better Auth** - Modern authentication library
- **Kysely** - Type-safe SQL query builder
- **PostgreSQL** - Primary database
- **shadcn/ui (Svelte)** - UI component library
- **TailwindCSS v4** - Utility-first CSS framework
- **Bun** as package manager (bun.lock present)

### Database & Query Builder

- **PostgreSQL** with Docker Compose setup
- **Kysely** type-safe SQL query builder
- **Atlas** for database schema migrations
- Generated TypeScript database types with kysely-codegen
- **⚠️ CRITICAL**: Always run `bun run gentypes` after any schema changes

### UI & Styling

- **shadcn/ui for Svelte** - Complete component library
- **TailwindCSS v4** with Vite plugin integration
- **Lucide icons** for consistent iconography
- Mobile-responsive design patterns

## Remote Functions Implementation

This project uses **SvelteKit Remote Functions** (experimental feature in 2.27+) as the primary way of interaction with the server, providing type-safe server-client communication. Remote functions allow you to call server-side code from anywhere in your app while maintaining type safety.

### Remote Functions Documentation

Whenever remote functions are necessary, take a look at: @REMOTE_FUNCTIONS_DOCS.md to understand how to use and all of the features and possibilities.

## Database Setup & Management

### Local Development

1. **Generate migrations**: `bun run db:generate`
2. **Run migrations**: `bun run db:migrate`

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

## App Philosophy

Always aim for highest possible usability and enjoyment in using the product. Think of Linear as an inpiration of quality and usability whenever developing or improving features.
Things to keep in mind while developing:

- Always make the app fast.
- Always do data transformations and basic logic(like summing up stuff, avg, etc.) in the database, if something can be done in the database easily, it probably should be done in the database. This improves app speed and load greatly, at minimal cost in database load.
- Always store relevant state in the query params, like filters, opened modals, etc.
- Always add keyboard shortcuts for important features, like "/" to quickly go to the search input, "C" to open up the modal for creating a new entity.
- Always add relevant things for that page into the Command(CMD+K) shortcuts, for example, this app contains a todo page that has specific commands when the CMD+K is pressed inside of the page.
- Use Shallow Routing for improved usability when applicable.

## Authentication Flow

### Better Auth Integration

- Server-side configuration in `src/lib/server/auth.ts`
- Email/password provider enabled
- Always do auth on the server side, to improve page load speed.
- Active Organizations are determined by the [organization_slug] route param, not the oganization in the session, keep that in mind. This is done in order to be able to have multiple tabs opened in separate organizations and not have auth problems.
- Always make the UI give user's feedback on their actions, pressing something and nothing happening is a horrible experience.

## Component Library

### shadcn/ui Components Available at $lib/components/ui

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
- Ensure mobile-ready: stack to a single column, rely on min-w-0 and truncate to keep content readable.
  - Create mobile alternatives for data-tables (which are not fun to use on mobile)
  - For Dropdowns/Selects, think if a Sheet component or something else is more usable for mobile given the page, in most cases, it is.

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

8. Always think of how features play with the rest of the app.

- The app should feel like a well coordinated thing, not a bunch of features trown together that do not tie into each other.

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
