<script lang="ts">
	import { goto } from '$app/navigation';
	import SignInForm from '$lib/components/signin-form.svelte';
	import { authClient } from '@/auth-client';
	import { GalleryVerticalEndIcon } from '@lucide/svelte';

	const session = authClient.useSession();
	const organizations = authClient.useListOrganizations();

	if ($session.data) {
		if ($organizations.data && $organizations.data?.length > 0) {
			goto(`/${$organizations.data[0].slug}/dashboard`);
		} else {
			// here we should redirect the user to a page where he is obligated to create an organization.
			goto('/create-organization');
		}
	}
</script>

<div class="flex h-full flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
	<div class="flex w-full max-w-sm flex-col gap-6">
		<a href="##" class="flex items-center gap-2 self-center font-medium">
			<div
				class="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
			>
				<GalleryVerticalEndIcon class="size-4" />
			</div>
			Acme Inc.
		</a>
		<SignInForm />
	</div>
</div>
