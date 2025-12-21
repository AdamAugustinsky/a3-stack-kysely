<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { createOrganizationDialogForm } from '../../routes/auth.remote';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { open = $bindable(false), onSuccess }: { open?: boolean; onSuccess?: () => void } = $props();

	const dialogForm = createOrganizationDialogForm.for('dialog');

	// Auto-generate slug from name
	$effect(() => {
		const name = dialogForm.fields.name.value();
		const slug = dialogForm.fields.slug.value();
		if (name && !slug) {
			dialogForm.fields.slug.set(
				name
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, '')
			);
		}
	});

	function handleOpenChange(value: boolean) {
		open = value;
		if (!value) {
			dialogForm.fields.set({ name: '', slug: '' });
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
			{...dialogForm.enhance(async ({ form, submit }) => {
				try {
					await submit();
					const result = dialogForm.result;

					open = false;
					onSuccess?.();

					if (result?.slug) {
						if (page.params.organization_slug) {
							const newPath = page.url.pathname.replace(
								page.params.organization_slug,
								result.slug
							);
							goto(newPath, { replaceState: true });
						} else {
							goto(`/${result.slug}/dashboard`, { replaceState: true });
						}
					}

					form.reset();
				} catch {
					// Errors are shown via field issues
				}
			})}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="dialog-name">Organization name</Label>
				<Input
					{...dialogForm.fields.name.as('text')}
					id="dialog-name"
					placeholder="Acme Inc"
					disabled={!!dialogForm.pending}
				/>
				{#each dialogForm.fields.name.issues() as issue (issue.message)}
					<p class="text-xs text-destructive">{issue.message}</p>
				{/each}
			</div>

			<div class="space-y-2">
				<Label for="dialog-slug">Organization slug</Label>
				<Input
					{...dialogForm.fields.slug.as('text')}
					id="dialog-slug"
					placeholder="acme-inc"
					disabled={!!dialogForm.pending}
				/>
				{#each dialogForm.fields.slug.issues() as issue (issue.message)}
					<p class="text-xs text-destructive">{issue.message}</p>
				{/each}
				<p class="text-xs text-muted-foreground">
					Used in URLs and must be unique. Only lowercase letters, numbers, and hyphens.
				</p>
			</div>

			{#each dialogForm.fields.allIssues() as issue (issue.message)}
				<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
					{issue.message}
				</div>
			{/each}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)} disabled={!!dialogForm.pending}>
					Cancel
				</Button>
				<Button type="submit" disabled={!!dialogForm.pending}>
					<PlusIcon class="mr-2 size-4" />
					Create organization
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
