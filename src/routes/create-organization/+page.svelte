<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '@/auth-client';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { GalleryVerticalEndIcon } from '@lucide/svelte';

	let errorValue = $state<string | undefined>();
	let loading = $state(false);
	let nameValue = $state('');
	let slugValue = $state('');

	const session = authClient.useSession();
	const organizations = authClient.useListOrganizations();

	// Auto-generate slug from name if user hasn't typed a slug yet
	$effect(() => {
		if (nameValue && !slugValue) {
			slugValue = nameValue
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '');
		}
	});

	// Guard route: if unauthenticated, go to sign-in; if already has orgs, go to dashboard
	$effect(() => {
		if ($session.data === null) {
			goto('/sign-in');
		} else if ($session.data && $organizations.data && $organizations.data.length > 0) {
			goto(`/${$organizations.data[0].slug}/dashboard`);
		}
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		errorValue = undefined;
		loading = true;
		try {
			await authClient.organization.create({ name: nameValue, slug: slugValue });
			try {
				await authClient.organization.setActive({ organizationSlug: slugValue });
			} catch {}
			goto(`/${slugValue}/dashboard`);
		} catch (error) {
			errorValue = error instanceof Error ? error.message : 'Failed to create organization';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex h-full flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
	<div class="flex w-full max-w-sm flex-col gap-6">
		<a href="/" class="flex items-center gap-2 self-center font-medium">
			<div
				class="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
			>
				<GalleryVerticalEndIcon class="size-4" />
			</div>
			Acme Inc.
		</a>

		<div class="rounded-lg border bg-background p-6 shadow-sm">
			<h1 class="mb-1 text-lg font-semibold">Create your organization</h1>
			<p class="mb-4 text-sm text-muted-foreground">
				You need an organization to continue. Choose a name and a unique slug.
			</p>

			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="space-y-2">
					<Label for="name">Organization name</Label>
					<Input
						id="name"
						name="name"
						bind:value={nameValue}
						placeholder="Acme Inc"
						disabled={loading}
						required
					/>
				</div>

				<div class="space-y-2">
					<Label for="slug">Organization slug</Label>
					<Input
						id="slug"
						name="slug"
						bind:value={slugValue}
						placeholder="acme-inc"
						disabled={loading}
						required
					/>
					<p class="text-xs text-muted-foreground">
						Used in URLs. Lowercase, numbers and hyphens only.
					</p>
				</div>

				{#if errorValue}
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{errorValue}</div>
				{/if}

				<div class="flex items-center justify-end gap-2">
					<Button type="submit" disabled={loading}>Create organization</Button>
				</div>
			</form>
		</div>
	</div>
</div>
