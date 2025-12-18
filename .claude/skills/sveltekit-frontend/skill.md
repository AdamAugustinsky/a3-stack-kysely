---
name: SvelteKit Frontend Patterns
description: Build SvelteKit 5 frontend features with remote functions, Svelte 5 reactivity, shadcn/ui components, and proper data loading patterns. Use when creating pages, forms, components, or working with remote functions in the web app.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# SvelteKit Frontend Patterns

This skill covers SvelteKit 5 with remote functions, shadcn/ui, and TailwindCSS v4.

> **Note:** For detailed backend implementation of remote functions (query, form, command, prerender),
> see the **sveltekit-remote-functions** skill. This skill focuses on frontend usage patterns.

## Tech Stack

- **SvelteKit 5** with experimental features
- **Better Auth** for authentication
- **shadcn/ui for Svelte** components at `$lib/components/ui`
- **TailwindCSS v4**
- **Lucide icons**

## Svelte 5 Reactivity

```svelte
<script>
  // State
  let count = $state(0);
  
  // Derived (simple expressions only)
  let doubled = $derived(count * 2);
  
  // Derived with complex logic
  let formatted = $derived.by(() => {
    if (count > 10) return 'High';
    return 'Low';
  });
</script>
```

## Data Loading with Remote Functions

**Always use `await` with queries and wrap in `<svelte:boundary>`.**

### Content Component (items-content.svelte)

```svelte
<script>
  import { getItems } from './items.remote';
  import { page } from '$app/state';

  // Use $derived only when query depends on reactive state
  let { items } = $derived(await getItems({
    organizationSlug: page.params.organization_slug ?? '',
    filters: filterStore.filters  // reactive dependency
  }));

  // If no reactive deps, just use await directly
  // let { items } = await getItems({ organizationSlug: page.params.organization_slug ?? '' });

  let searchTerm = $state('');
  const filtered = $derived(items.filter(i => i.name.includes(searchTerm)));
</script>
```

### Page with Boundary (+page.svelte)

```svelte
<script>
  import ItemsContent from './items-content.svelte';
  import Loader2Icon from '@lucide/svelte/icons/loader-2';
</script>

<svelte:boundary>
  <ItemsContent />

  {#snippet pending()}
    <div class="py-8 text-center">
      <Loader2Icon class="size-8 animate-spin" />
    </div>
  {/snippet}

  {#snippet failed(error, reset)}
    <div class="text-destructive">
      {error instanceof Error ? error.message : 'Error'}
      <button onclick={reset}>Retry</button>
    </div>
  {/snippet}
</svelte:boundary>
```

## Using Remote Functions (Frontend)

### Calling Queries

```svelte
<script>
  import { getItems } from './items.remote';
  
  // Simple call
  let items = await getItems();
  
  // With reactive argument - use $derived
  let { data } = $derived(await getItems({ slug: page.params.slug }));
</script>
```

### Refreshing Queries

```svelte
<button onclick={() => getItems().refresh()}>
  Refresh
</button>
```

### Using Forms
Forms are the primary way of action in the SvelteKit philosophy (web native) 

```svelte
<script>
  import { createItem } from './items.remote';
  import { toast } from 'svelte-sonner';
  
  let submitting = $state(false);
</script>

<!-- Basic form spread -->
<form {...createItem}>
  <input {...createItem.fields.title.as('text')} />
  <button>Create</button>
</form>

<!-- Enhanced form with callbacks -->
<form {...createItem.enhance(async ({ submit, form }) => {
  submitting = true;
  try {
    await submit();
    form.reset();
    toast.success('Created!');
  } catch (e) {
    toast.error('Failed');
  } finally {
    submitting = false;
  }
})}>
  <input {...createItem.fields.title.as('text')} />
  <button disabled={submitting}>Create</button>
</form>
```

### Displaying Validation Errors

```svelte
<form {...createItem}>
  <input {...createItem.fields.title.as('text')} />
  {#each createItem.fields.title.issues() as issue}
    <p class="text-xs text-destructive">{issue.message}</p>
  {/each}
</form>
```

### Using Commands

```svelte
<script>
  import { deleteItem, getItems } from './items.remote';
  import { toast } from 'svelte-sonner';
</script>

<button onclick={async () => {
  try {
    await deleteItem(item.id).updates(getItems());
    toast.success('Deleted');
  } catch (e) {
    toast.error('Failed');
  }
}}>
  Delete
</button>
```

## Forms with Shared Snippets

Reuse form UI between create and edit modes:

```svelte
<script lang="ts">
  import { createItemForm, updateItemForm } from './items.remote';
  import { toast } from 'svelte-sonner';

  let createDialogOpen = $state(false);
  let editDialogOpen = $state(false);
  let editingItem = $state<Item | undefined>();
  let submitting = $state(false);
</script>

{#snippet itemFormSnippet(formObj: typeof createItemForm | typeof updateItemForm, item?: Item)}
  <input type="hidden" name="organizationSlug" value={organizationSlug} />
  {#if item}
    <input type="hidden" name="itemId" value={item.id} />
  {/if}
  
  <Input name="title" value={item?.title ?? ''} />
  {#if formObj.issues?.title}
    {#each formObj.issues.title as issue}
      <p class="text-xs text-destructive">{issue.message}</p>
    {/each}
  {/if}
{/snippet}

<!-- Create Form -->
<form {...createItemForm.enhance(async ({ submit }) => {
  submitting = true;
  try {
    await submit();
    createDialogOpen = false;
    toast.success('Created');
  } catch (e) {
    toast.error('Failed');
  } finally {
    submitting = false;
  }
})}>
  {@render itemFormSnippet(createItemForm)}
</form>
```

## Design Principles

### Layout

- Two-column grid for settings (2/3 main, 1/3 meta)
- Stack to single column on mobile
- Use `min-w-0` and `truncate` for overflow text
- Tight paddings to avoid micro-scroll: `pb-1`, `py-1`, `space-y-2`

### Responsiveness

- Create mobile alternatives for data tables (card lists)
- Use Sheet components for dropdowns on mobile
- Always test on small viewports

### Dividers vs Cards

**Dividers** for sequential/grouped content:
```svelte
<div class="divide-y divide-border/40">
  {#each items as item}
    <div class="py-4 first:pt-0">{item.name}</div>
  {/each}
</div>
```

**Cards** for independent, clickable items.

### Feedback

- Toast notifications for actions
- Inline alerts near page header
- Loading spinners during async ops
- Never leave actions without feedback

### Keyboard Shortcuts

Use `Kbd` component for hints:
```svelte
<Kbd content="/" />
<Kbd content="C" variant="onPrimary" />
```

Add shortcuts for: `/` (search), `C` (create), `CMD+K` (command palette).

## Path Aliases

- `$lib/*` → `./src/lib/*`
- `@/*` → `./src/lib/*`
- `@routes/*` → `./src/routes/*`

## Anti-Patterns

- Using `.loading/.error/.current` pattern for queries that are very fast (causes flickering)
- Separate create/edit form UIs (use snippets)
- Missing keys in `{#each}` blocks
- Forgetting `.refresh()` or `.updates()` after mutations
