<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import UserIcon from '@tabler/icons-svelte/icons/user';
	import MailIcon from '@tabler/icons-svelte/icons/mail';
	import CalendarIcon from '@tabler/icons-svelte/icons/calendar';
	import ShieldIcon from '@tabler/icons-svelte/icons/shield';
	import AlertCircleIcon from '@tabler/icons-svelte/icons/alert-circle';
	import CheckIcon from '@tabler/icons-svelte/icons/check';
	import { updateProfile } from './profile.remote';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	// Form state
	let name = $state(data.user.name);
	let isEditing = $state(false);
	let isLoading = $state(false);

	// Inline UI state
	let alert: { type: 'success' | 'error'; message: string } | undefined = $state();
	let showSkeleton = $state(false);

	// Generate initials from user name
	const initials = data.user.name
		.split(' ')
		.map((word) => word[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);

	// Format date
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	async function handleSave() {
		isLoading = true;
		alert = undefined;
		try {
			const result = await updateProfile({ name });

			if (result.success) {
				alert = { type: 'success', message: 'Profile updated successfully.' };
				await invalidateAll(); // Refresh the page data
				isEditing = false;
			}
		} catch (error) {
			alert = { type: 'error', message: 'Failed to save profile. Please try again.' };
			console.error('Failed to save profile:', error);
		} finally {
			isLoading = false;
			// slight UX delay to show loading skeletons if needed
			showSkeleton = false;
		}
	}

	function handleCancel() {
		// Reset form to original values
		name = data.user.name;
		isEditing = false;
		alert = undefined;
	}

	function startEdit() {
		alert = undefined;
		isEditing = true;
	}

	function copy(text: string) {
		try {
			navigator.clipboard?.writeText(text);
			alert = { type: 'success', message: 'Copied to clipboard.' };
			setTimeout(() => {
				if (alert?.message === 'Copied to clipboard.') alert = undefined;
			}, 1500);
		} catch {
			alert = { type: 'error', message: 'Failed to copy.' };
		}
	}
</script>

<svelte:head>
	<title>Account - Profile Settings</title>
</svelte:head>

<div class="container mx-auto max-w-5xl p-5">
	<!-- Page Header -->
	<div class="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Account Settings</h1>
			<p class="text-muted-foreground">Manage your profile, account and security.</p>
		</div>
		{#if !isEditing}
			<Button variant="outline" onclick={startEdit} class="max-w-full truncate">
				<UserIcon class="mr-2 size-4 shrink-0" />
				<span class="truncate">Edit Profile</span>
			</Button>
		{/if}
	</div>

	<!-- Inline Alerts -->
	{#if alert}
		<div
			class="mb-4 flex items-start gap-2 rounded-md border p-3 {alert.type === 'error'
				? 'border-red-200 bg-red-50 text-red-700'
				: 'border-green-200 bg-green-50 text-green-700'}"
		>
			{#if alert.type === 'error'}
				<AlertCircleIcon class="mt-0.5 size-4" />
			{:else}
				<CheckIcon class="mt-0.5 size-4" />
			{/if}
			<p class="text-sm">{alert.message}</p>
		</div>
	{/if}

	<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
		<!-- Left: Profile -->
		<Card class="md:col-span-2">
			<CardHeader class="pb-1">
				<div class="flex items-center gap-4">
					<Avatar class="size-16 shrink-0 sm:size-20">
						<AvatarImage src={data.user.image} alt={data.user.name} />
						<AvatarFallback class="text-base sm:text-lg">{initials}</AvatarFallback>
					</Avatar>
					<div class="min-w-0 space-y-1">
						<CardTitle class="truncate text-xl sm:text-2xl">{data.user.name}</CardTitle>
						<CardDescription class="truncate text-sm sm:text-base"
							>{data.user.email}</CardDescription
						>
					</div>
				</div>
			</CardHeader>

			<CardContent class="space-y-4">
				<Separator />
				<div class="space-y-1">
					<h3 class="text-lg font-medium">Profile</h3>
					<p class="text-sm text-muted-foreground">Basic information for your account.</p>
				</div>

				<!-- Skeletons when loading -->
				{#if isLoading && showSkeleton}
					<div class="grid gap-4">
						<div class="h-5 w-24 animate-pulse rounded bg-muted"></div>
						<div class="h-10 w-full animate-pulse rounded bg-muted"></div>
						<div class="h-5 w-48 animate-pulse rounded bg-muted"></div>
					</div>
				{:else}
					<div class="grid gap-4">
						<!-- Name Field -->
						<div class="grid gap-2">
							<Label for="name">Full Name</Label>
							{#if isEditing}
								<Input
									id="name"
									bind:value={name}
									placeholder="Enter your full name"
									disabled={isLoading}
								/>
								<p class="text-xs text-muted-foreground">
									Use your real name so people can recognize you.
								</p>
							{:else}
								<div class="flex items-center space-x-2 py-1">
									<UserIcon class="size-4 shrink-0 text-muted-foreground" />
									<span class="truncate text-sm">{data.user.name}</span>
								</div>
							{/if}
						</div>

						<!-- Email Field (read only) -->
						<div class="grid gap-2">
							<Label for="email">Email Address</Label>
							<div class="flex items-center space-x-2 py-1">
								<MailIcon class="size-4 shrink-0 text-muted-foreground" />
								<span class="truncate text-sm">{data.user.email}</span>
								<span class="text-xs whitespace-nowrap text-muted-foreground"
									>(Email cannot be changed)</span
								>
							</div>
						</div>

						<!-- Action Buttons (only show when editing) -->
						{#if isEditing}
							<div class="flex flex-col gap-2 pt-2 sm:flex-row">
								<Button onclick={handleSave} disabled={isLoading}>
									{isLoading ? 'Saving...' : 'Save Changes'}
								</Button>
								<Button variant="outline" onclick={handleCancel} disabled={isLoading}>
									Cancel
								</Button>
							</div>
						{/if}
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Right: Meta -->
		<div class="space-y-5">
			<Card>
				<CardHeader class="pb-1">
					<CardTitle>Account</CardTitle>
					<CardDescription>Identifiers and status.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2">
					<div class="flex items-center justify-between gap-3 py-1">
						<div class="flex min-w-0 items-center space-x-2">
							<CalendarIcon class="size-4 shrink-0 text-muted-foreground" />
							<span class="text-sm font-medium">Created</span>
						</div>
						<span class="truncate text-sm text-muted-foreground">
							{formatDate(data.user.createdAt.toString())}
						</span>
					</div>

					<div class="flex items-center justify-between gap-3 py-1">
						<div class="flex min-w-0 items-center space-x-2">
							<ShieldIcon class="size-4 shrink-0 text-muted-foreground" />
							<span class="text-sm font-medium">User ID</span>
						</div>
						<div class="flex max-w-[65%] items-center gap-2">
							<span class="truncate font-mono text-xs text-muted-foreground">{data.user.id}</span>
							<Button
								size="sm"
								variant="outline"
								class="h-7 shrink-0"
								onclick={() => copy(data.user.id)}
							>
								Copy
							</Button>
						</div>
					</div>

					<div class="flex items-center justify-between gap-3 py-1">
						<div class="flex min-w-0 items-center space-x-2">
							<MailIcon class="size-4 shrink-0 text-muted-foreground" />
							<span class="text-sm font-medium">Email Verified</span>
						</div>
						<span class="text-sm whitespace-nowrap">
							{#if data.user.emailVerified}
								<span class="font-medium text-green-600">✓ Verified</span>
							{:else}
								<span class="font-medium text-orange-600">⚠ Not Verified</span>
							{/if}
						</span>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader class="pb-1">
					<CardTitle>Security</CardTitle>
					<CardDescription>Password and protection.</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<p class="text-sm font-medium">Password</p>
							<p class="text-xs text-muted-foreground">
								Last updated: {formatDate(data.user.updatedAt.toString())}
							</p>
						</div>
						<Button
							variant="outline"
							onclick={() => window.alert('Change password functionality coming soon!')}
						>
							Change Password
						</Button>
					</div>
				</CardContent>
			</Card>

			<Card class="border-destructive">
				<CardHeader class="pb-1">
					<CardTitle class="text-destructive">Danger Zone</CardTitle>
					<CardDescription>Irreversible and destructive actions.</CardDescription>
				</CardHeader>
				<CardContent>
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<p class="text-sm font-medium">Delete Account</p>
								<p class="text-xs text-muted-foreground">
									Permanently delete your account and all associated data.
								</p>
							</div>
							<Button
								variant="destructive"
								onclick={() => {
									window.alert('Account deletion is not implemented yet.');
								}}
							>
								Delete Account
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	</div>
</div>
