<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import CreateOrganizationForm from './create-organization-form.svelte';

	let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

<Dialog.Root {open}>
	<Dialog.Content class="sm:max-w-106.25">
		<Dialog.Header>
			<Dialog.Title>Create your first organization</Dialog.Title>
			<Dialog.Description>
				Organizations help you manage teams and collaborate. Create your first one to get started.
			</Dialog.Description>
		</Dialog.Header>

		<CreateOrganizationForm />
	</Dialog.Content>
</Dialog.Root>
