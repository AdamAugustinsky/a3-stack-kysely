<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { GalleryVerticalEndIcon } from '@lucide/svelte';
	import { createOrganizationForm } from '../auth.remote';

	// Auto-generate slug from name
	$effect(() => {
		const name = createOrganizationForm.fields.name.value();
		const slug = createOrganizationForm.fields.slug.value();
		if (name && !slug) {
			createOrganizationForm.fields.slug.set(
				name
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, '-')
					.replace(/^-|-$/g, '')
			);
		}
	});
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

			<form {...createOrganizationForm} class="space-y-4">
				<div class="space-y-2">
					<Label for="name">Organization name</Label>
					<Input
						{...createOrganizationForm.fields.name.as('text')}
						id="name"
						placeholder="Acme Inc"
						disabled={!!createOrganizationForm.pending}
					/>
					{#each createOrganizationForm.fields.name.issues() as issue (issue.message)}
						<p class="text-xs text-destructive">{issue.message}</p>
					{/each}
				</div>

				<div class="space-y-2">
					<Label for="slug">Organization slug</Label>
					<Input
						{...createOrganizationForm.fields.slug.as('text')}
						id="slug"
						placeholder="acme-inc"
						disabled={!!createOrganizationForm.pending}
					/>
					{#each createOrganizationForm.fields.slug.issues() as issue (issue.message)}
						<p class="text-xs text-destructive">{issue.message}</p>
					{/each}
					<p class="text-xs text-muted-foreground">
						Used in URLs. Lowercase, numbers and hyphens only.
					</p>
				</div>

				{#each createOrganizationForm.fields.allIssues() as issue (issue.message)}
					<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{issue.message}</div>
				{/each}

				<div class="flex items-center justify-end gap-2">
					<Button type="submit" disabled={!!createOrganizationForm.pending}>Create organization</Button>
				</div>
			</form>
		</div>
	</div>
</div>
