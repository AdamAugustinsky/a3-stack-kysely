<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { isHttpError } from '@sveltejs/kit';
	import { createOrganization } from '$lib/remote/organization.remote';
	import * as v from 'valibot';

	const schema = v.object({
		name: v.pipe(v.string(), v.minLength(1, 'Organization name is required')),
		slug: v.pipe(v.string(), v.minLength(1, 'Organization slug is required'))
	});

	let errorValue = $state<string | undefined>();
	let isLoading = $state(false);

	$effect(() => {
		const name = createOrganization.fields.name.value();
		if (name) {
			const proposedSlug = name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '');

			createOrganization.fields.slug.set(proposedSlug);
		}
	});
</script>

<form
	{...createOrganization.preflight(schema).enhance(async ({ submit }) => {
		errorValue = undefined;
		isLoading = true;
		try {
			await submit();
			const slug = createOrganization.fields.slug.value();
			goto(resolve('/(protected)/[organization_slug]/dashboard', { organization_slug: slug }));
		} catch (error) {
			if (isHttpError(error)) {
				errorValue = error.body.message;
			} else {
				errorValue = error instanceof Error ? error.message : 'Failed to create organization';
			}
		} finally {
			isLoading = false;
		}
	})}
	onchange={() => createOrganization.validate()}
	class="space-y-4"
>
	<div class="space-y-2">
		<Label for="name">Organization name</Label>
		<Input
			{...createOrganization.fields.name.as('text')}
			id="name"
			placeholder="Acme Inc"
			disabled={isLoading}
		/>
		{#each createOrganization.fields.name.issues() ?? [] as issue}
			<p class="text-xs text-destructive">{issue.message}</p>
		{/each}
	</div>

	<div class="space-y-2">
		<Label for="slug">Organization slug</Label>
		<Input
			{...createOrganization.fields.slug.as('text')}
			id="slug"
			placeholder="acme-inc"
			disabled={isLoading}
		/>
		{#each createOrganization.fields.slug.issues() ?? [] as issue}
			<p class="text-xs text-destructive">{issue.message}</p>
		{/each}
		<p class="text-xs text-muted-foreground">Used in URLs. Lowercase, numbers and hyphens only.</p>
	</div>

	{#if errorValue}
		<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errorValue}</div>
	{/if}

	<div class="flex items-center justify-end gap-2">
		<Button type="submit" disabled={isLoading}>
			{isLoading ? 'Creating...' : 'Create organization'}
		</Button>
	</div>
</form>
