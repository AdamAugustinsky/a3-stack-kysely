<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { authClient } from '$lib/auth-client';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { open = $bindable(false), onSuccess }: { open?: boolean; onSuccess?: () => void } = $props();

	let errorValue = $state<string | undefined>();
	let loading = $state(false);
	let nameValue = $state('');
	let slugValue = $state('');

	// Auto-generate slug from name
	$effect(() => {
		const proposalSlug = nameValue
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');

		if (nameValue && slugValue !== proposalSlug) {
			slugValue = proposalSlug;
		}
	});

	function handleOpenChange(value: boolean) {
		open = value;
		if (!value) {
			// Reset form when closing
			errorValue = undefined;
			nameValue = '';
			slugValue = '';
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Create your first organization</Dialog.Title>
			<Dialog.Description>
				Organizations help you manage teams and collaborate. Create your first one to get started.
			</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={async (e) => {
				e.preventDefault();
				errorValue = undefined;
				loading = true;

				try {
					const result = await authClient.organization.create({
						name: nameValue,
						slug: slugValue
					});

					open = false;
					// Call success callback to refresh organization list
					onSuccess?.();

					// Redirect to the newly created organization
					if (result.data?.slug) {
						// If we're already in an org route, replace the org slug
						if (page.params.organization_slug) {
							const newPath = page.url.pathname.replace(
								page.params.organization_slug,
								result.data.slug
							);
							goto(newPath, { replaceState: true });
						} else {
							// Otherwise navigate to the dashboard of the new org
							goto(`/${result.data.slug}/dashboard`, { replaceState: true });
						}
					}
				} catch (error) {
					if (error instanceof Error) {
						errorValue = error.message;
					} else {
						errorValue = 'An unexpected error occurred';
					}
				} finally {
					loading = false;
				}
			}}
			class="space-y-4"
		>
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
					Used in URLs and must be unique. Only lowercase letters, numbers, and hyphens.
				</p>
			</div>

			{#if errorValue}
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{errorValue}
				</div>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={loading}>
					Cancel
				</Button>
				<Button type="submit" disabled={loading}>
					<PlusIcon class="mr-2 size-4" />
					Create organization
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
