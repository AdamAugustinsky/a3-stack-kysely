<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { authClient } from '$lib/auth-client';
	import PlusIcon from '@lucide/svelte/icons/plus';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	let errorValue = $state<string | undefined>();
	let loading = $state(false);
	let nameValue = $state('');
	let slugValue = $state('');

	// Auto-generate slug from name
	$effect(() => {
		if (nameValue && !slugValue) {
			slugValue = nameValue
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '');
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
					await authClient.organization.create({
						name: nameValue,
						slug: slugValue
					});
					open = false;
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
