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
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import BuildingIcon from '@tabler/icons-svelte/icons/building';
	import CalendarIcon from '@tabler/icons-svelte/icons/calendar';
	import ShieldIcon from '@tabler/icons-svelte/icons/shield';
	import UsersIcon from '@tabler/icons-svelte/icons/users';
	import MailIcon from '@tabler/icons-svelte/icons/mail';
	import TrashIcon from '@tabler/icons-svelte/icons/trash';
	import SendIcon from '@tabler/icons-svelte/icons/send';
	import XIcon from '@tabler/icons-svelte/icons/x';
	import AlertCircleIcon from '@tabler/icons-svelte/icons/alert-circle';
	import CheckIcon from '@tabler/icons-svelte/icons/check';
	import CrownIcon from '@tabler/icons-svelte/icons/crown';
	import UserPlusIcon from '@tabler/icons-svelte/icons/user-plus';
	import { authClient } from '$lib/auth-client';
	import {
		updateOrganization,
		deleteOrganization,
		inviteMember,
		updateMemberRole,
		removeMember,
		cancelInvitation,
		setActiveOrganization
	} from '../organization.remote';
	import { goto, invalidateAll } from '$app/navigation';
	import { navigateTo } from '@/client.utils.svelte';

	// Reactive organization data
	const activeOrganization = authClient.useActiveOrganization();
	const session = authClient.useSession();

	// Organization details state
	let isEditing = $state(false);
	let isSaving = $state(false);

	// Form state
	let nameValue = $state('');
	let slugValue = $state('');
	let logoValue = $state('');

	// UI state
	let alert: { type: 'success' | 'error'; message: string } | undefined = $state();
	let showInviteDialog = $state(false);
	let showDeleteDialog = $state(false);

	// Invitation form state
	let inviteEmail = $state('');
	let inviteRole = $state<'member' | 'admin' | 'owner'>('member');
	let isInviting = $state(false);

	// Current user's role in the organization
	const currentUserRole = $derived.by(() => {
		if (!$activeOrganization.data || !$session.data?.user) return '';
		const member = $activeOrganization.data.members?.find(
			(m) => m.userId === $session.data?.user.id
		);
		return member?.role ?? '';
	});

	const isOwner = $derived(currentUserRole === 'owner');
	const isAdmin = $derived(currentUserRole === 'admin' || isOwner);

	// Format date
	function formatDate(dateString: string | Date) {
		const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Copy to clipboard
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

	// Save organization details
	async function handleSaveDetails() {
		if (!$activeOrganization.data) return;

		isSaving = true;
		alert = undefined;

		try {
			await updateOrganization({
				organizationId: $activeOrganization.data.id,
				data: {
					name: nameValue,
					slug: slugValue,
					logo: logoValue || undefined
				}
			});

			alert = { type: 'success', message: 'Organization details updated successfully.' };
			isEditing = false;
			$activeOrganization.refetch();
		} catch (error) {
			alert = { type: 'error', message: 'Failed to update organization details.' };
			console.error('Failed to save organization:', error);
		} finally {
			isSaving = false;
		}
	}

	// Cancel editing
	function handleCancelEdit() {
		if (!$activeOrganization.data) return;
		nameValue = $activeOrganization.data.name;
		slugValue = $activeOrganization.data.slug || '';
		logoValue = $activeOrganization.data.logo || '';
		isEditing = false;
		alert = undefined;
	}

	// Send invitation
	async function handleSendInvitation() {
		if (!inviteEmail || !$activeOrganization.data) return;

		isInviting = true;
		try {
			await inviteMember({
				email: inviteEmail,
				role: inviteRole,
				organizationId: $activeOrganization.data.id
			});

			showInviteDialog = false;
			inviteEmail = '';
			inviteRole = 'member';
			alert = { type: 'success', message: 'Invitation sent successfully.' };
			$activeOrganization.refetch();
		} catch (error) {
			alert = { type: 'error', message: 'Failed to send invitation.' };
			console.error('Failed to send invitation:', error);
		} finally {
			isInviting = false;
		}
	}

	// Cancel invitation
	async function handleCancelInvitation(invitationId: string) {
		try {
			await cancelInvitation({ invitationId });
			alert = { type: 'success', message: 'Invitation cancelled.' };
			$activeOrganization.refetch();
		} catch (error) {
			alert = { type: 'error', message: 'Failed to cancel invitation.' };
			console.error('Failed to cancel invitation:', error);
		}
	}

	// Update member role
	async function handleUpdateMemberRole(memberId: string, newRole: 'member' | 'admin' | 'owner') {
		if (!$activeOrganization.data) return;

		try {
			await updateMemberRole({
				memberId,
				role: newRole,
				organizationId: $activeOrganization.data.id
			});
			alert = { type: 'success', message: 'Member role updated.' };
			$activeOrganization.refetch();
		} catch (error) {
			alert = { type: 'error', message: 'Failed to update member role.' };
			console.error('Failed to update member role:', error);
		}
	}

	// Remove member
	async function handleRemoveMember(memberId: string, userEmail: string) {
		if (!$activeOrganization.data) return;

		try {
			await removeMember({
				memberIdOrEmail: userEmail,
				organizationId: $activeOrganization.data.id
			});
			alert = { type: 'success', message: 'Member removed from organization.' };
			$activeOrganization.refetch();
		} catch (error) {
			alert = { type: 'error', message: 'Failed to remove member.' };
			console.error('Failed to remove member:', error);
		}
	}

	// Delete organization
	async function handleDeleteOrganization() {
		if (!$activeOrganization.data) return;

		try {
			await deleteOrganization({
				organizationId: $activeOrganization.data.id
			});

			// Clear active organization and redirect
			await setActiveOrganization({ organizationId: null });
			await invalidateAll();

			goto('/sign-in');
		} catch (error) {
			alert = { type: 'error', message: 'Failed to delete organization.' };
			console.error('Failed to delete organization:', error);
		}
	}

	// Get role badge variant
	function getRoleBadgeVariant(role: string) {
		switch (role) {
			case 'owner':
				return 'default';
			case 'admin':
				return 'secondary';
			default:
				return 'outline';
		}
	}

	// Get role icon
	function getRoleIcon(role: string) {
		return role === 'owner' ? CrownIcon : ShieldIcon;
	}
</script>

<svelte:head>
	<title>Organization Settings</title>
</svelte:head>

<div class="container mx-auto max-w-5xl p-5">
	<!-- Page Header -->
	<div class="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Organization Settings</h1>
			<p class="text-muted-foreground">Manage your organization, members, and permissions.</p>
		</div>
		{#if isAdmin && !isEditing}
			<Button
				variant="outline"
				onclick={() => (isEditing = true)}
				disabled={$activeOrganization.isPending}
			>
				<BuildingIcon class="mr-2 size-4 shrink-0" />
				<span class="truncate">Edit Organization</span>
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

	{#if $activeOrganization.isPending}
		<!-- Loading skeleton -->
		<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
			<Card class="md:col-span-2">
				<CardHeader>
					<Skeleton class="h-8 w-48" />
					<Skeleton class="h-4 w-64" />
				</CardHeader>
				<CardContent class="space-y-4">
					<Skeleton class="h-32 w-full" />
				</CardContent>
			</Card>
			<div class="space-y-5">
				<Card>
					<CardHeader>
						<Skeleton class="h-6 w-32" />
					</CardHeader>
					<CardContent>
						<Skeleton class="h-24 w-full" />
					</CardContent>
				</Card>
			</div>
		</div>
	{:else if $activeOrganization.data}
		<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
			<!-- Left: Organization Details -->
			<Card class="md:col-span-2">
				<CardHeader class="pb-1">
					<div class="flex items-center gap-4">
						<Avatar class="size-16 shrink-0 sm:size-20">
							{#if $activeOrganization.data.logo}
								<AvatarImage
									src={$activeOrganization.data.logo}
									alt={$activeOrganization.data.name}
								/>
							{/if}
							<AvatarFallback class="text-base sm:text-lg">
								{$activeOrganization.data.name.slice(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div class="min-w-0 space-y-1">
							<CardTitle class="truncate text-xl sm:text-2xl"
								>{$activeOrganization.data.name}</CardTitle
							>
							{#if $activeOrganization.data.slug}
								<CardDescription class="truncate text-sm sm:text-base">
									/{$activeOrganization.data.slug}
								</CardDescription>
							{/if}
						</div>
					</div>
				</CardHeader>

				<CardContent class="space-y-4">
					<Separator />
					<div class="space-y-1">
						<h3 class="text-lg font-medium">Organization Details</h3>
						<p class="text-sm text-muted-foreground">Basic information for your organization.</p>
					</div>

					<div class="grid gap-4">
						<!-- Name Field -->
						<div class="grid gap-2">
							<Label for="name">Organization Name</Label>
							{#if isEditing}
								<Input
									id="name"
									bind:value={nameValue}
									placeholder="Enter organization name"
									disabled={isSaving}
								/>
							{:else}
								<div class="flex items-center space-x-2 py-1">
									<BuildingIcon class="size-4 shrink-0 text-muted-foreground" />
									<span class="truncate text-sm">{$activeOrganization.data.name}</span>
								</div>
							{/if}
						</div>

						<!-- Slug Field -->
						<div class="grid gap-2">
							<Label for="slug">Organization Slug</Label>
							{#if isEditing}
								<Input
									id="slug"
									bind:value={slugValue}
									placeholder="organization-slug"
									disabled={isSaving}
								/>
								<p class="text-xs text-muted-foreground">
									Used in URLs and must be unique. Only lowercase letters, numbers, and hyphens.
								</p>
							{:else}
								<div class="flex items-center space-x-2 py-1">
									<span class="truncate font-mono text-sm"
										>/{$activeOrganization.data.slug || 'no-slug'}</span
									>
								</div>
							{/if}
						</div>

						<!-- Logo URL Field -->
						<div class="grid gap-2">
							<Label for="logo">Logo URL</Label>
							{#if isEditing}
								<Input
									id="logo"
									bind:value={logoValue}
									placeholder="https://example.com/logo.png"
									disabled={isSaving}
								/>
								<p class="text-xs text-muted-foreground">
									Provide a URL to your organization's logo.
								</p>
							{:else if $activeOrganization.data.logo}
								<div class="flex items-center space-x-2 py-1">
									<span class="truncate text-sm">{$activeOrganization.data.logo}</span>
								</div>
							{:else}
								<span class="text-sm text-muted-foreground">No logo set</span>
							{/if}
						</div>

						<!-- Action Buttons (only show when editing) -->
						{#if isEditing}
							<div class="flex flex-col gap-2 pt-2 sm:flex-row">
								<Button onclick={handleSaveDetails} disabled={isSaving}>
									{isSaving ? 'Saving...' : 'Save Changes'}
								</Button>
								<Button variant="outline" onclick={handleCancelEdit} disabled={isSaving}>
									Cancel
								</Button>
							</div>
						{/if}
					</div>
				</CardContent>
			</Card>

			<!-- Right: Meta and Actions -->
			<div class="space-y-5">
				<Card>
					<CardHeader class="pb-1">
						<CardTitle>Organization Info</CardTitle>
						<CardDescription>Identifiers and metadata.</CardDescription>
					</CardHeader>
					<CardContent class="space-y-2">
						<div class="flex items-center justify-between gap-3 py-1">
							<div class="flex min-w-0 items-center space-x-2">
								<CalendarIcon class="size-4 shrink-0 text-muted-foreground" />
								<span class="text-sm font-medium">Created</span>
							</div>
							<span class="truncate text-sm text-muted-foreground">
								{formatDate($activeOrganization.data.createdAt)}
							</span>
						</div>

						<div class="flex items-center justify-between gap-3 py-1">
							<div class="flex min-w-0 items-center space-x-2">
								<ShieldIcon class="size-4 shrink-0 text-muted-foreground" />
								<span class="text-sm font-medium">Org ID</span>
							</div>
							<div class="flex max-w-[65%] items-center gap-2">
								<span class="truncate font-mono text-xs text-muted-foreground">
									{$activeOrganization.data.id}
								</span>
								<Button
									size="sm"
									variant="outline"
									class="h-7 shrink-0"
									onclick={() => copy($activeOrganization.data?.id ?? '')}
								>
									Copy
								</Button>
							</div>
						</div>

						<div class="flex items-center justify-between gap-3 py-1">
							<div class="flex min-w-0 items-center space-x-2">
								<UsersIcon class="size-4 shrink-0 text-muted-foreground" />
								<span class="text-sm font-medium">Members</span>
							</div>
							<span class="text-sm font-medium whitespace-nowrap">
								{$activeOrganization.data?.members.length}
								{$activeOrganization.data?.members.length === 1 ? 'member' : 'members'}
							</span>
						</div>

						{@const RoleIcon = getRoleIcon(currentUserRole)}
						<div class="flex items-center justify-between gap-3 py-1">
							<div class="flex min-w-0 items-center space-x-2">
								<RoleIcon class="size-4 shrink-0 text-muted-foreground" />
								<span class="text-sm font-medium">Your Role</span>
							</div>
							<Badge variant={getRoleBadgeVariant(currentUserRole)}>
								{currentUserRole}
							</Badge>
						</div>
					</CardContent>
				</Card>

				{#if isOwner}
					<Card class="border-destructive">
						<CardHeader class="pb-1">
							<CardTitle class="text-destructive">Danger Zone</CardTitle>
							<CardDescription>Irreversible and destructive actions.</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="space-y-4">
								<div class="flex items-center justify-between">
									<div class="space-y-1">
										<p class="text-sm font-medium">Delete Organization</p>
										<p class="text-xs text-muted-foreground">
											Permanently delete this organization and all data.
										</p>
									</div>
									<Button variant="destructive" onclick={() => (showDeleteDialog = true)}>
										Delete
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				{/if}
			</div>
		</div>

		<!-- Members Section -->
		<Card class="mt-5">
			<CardHeader class="pb-1">
				<div class="flex items-center justify-between">
					<div>
						<CardTitle>Members</CardTitle>
						<CardDescription>Manage organization members and their roles.</CardDescription>
					</div>
					{#if isAdmin}
						<Button onclick={() => (showInviteDialog = true)}>
							<UserPlusIcon class="mr-2 size-4" />
							Invite Member
						</Button>
					{/if}
				</div>
			</CardHeader>
			<CardContent>
				{#if $activeOrganization.data?.members.length > 0}
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Member</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Joined</TableHead>
								{#if isAdmin}
									<TableHead class="text-right">Actions</TableHead>
								{/if}
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each $activeOrganization.data?.members as member (member.id)}
								<TableRow>
									<TableCell>
										<div class="flex items-center gap-3">
											<Avatar class="size-8">
												{#if member.user?.image}
													<AvatarImage src={member.user.image} alt={member.user.name} />
												{/if}
												<AvatarFallback class="text-xs">
													{(member.user?.name || member.user?.email || 'U')
														.slice(0, 2)
														.toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div class="min-w-0">
												<p class="truncate text-sm font-medium">{member.user?.name || 'Unknown'}</p>
												<p class="truncate text-xs text-muted-foreground">{member.user?.email}</p>
											</div>
										</div>
									</TableCell>
									<TableCell>
										{#if isOwner && member.userId !== $session.data?.user?.id && member.role !== 'owner'}
											<select
												value={member.role}
												onchange={(e) =>
													handleUpdateMemberRole(
														member.id,
														e.currentTarget.value as 'member' | 'admin' | 'owner'
													)}
												class="flex h-8 w-[100px] items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
											>
												<option value="member">Member</option>
												<option value="admin">Admin</option>
												{#if isOwner}
													<option value="owner">Owner</option>
												{/if}
											</select>
										{:else}
											<Badge variant={getRoleBadgeVariant(member.role)}>
												{member.role}
											</Badge>
										{/if}
									</TableCell>
									<TableCell>
										<span class="text-sm text-muted-foreground">
											{formatDate(member.createdAt)}
										</span>
									</TableCell>
									{#if isAdmin}
										<TableCell class="text-right">
											{#if member.userId !== $session.data?.user?.id && member.role !== 'owner'}
												<Button
													size="sm"
													variant="ghost"
													onclick={() => handleRemoveMember(member.id, member.user?.email)}
												>
													<TrashIcon class="size-4" />
												</Button>
											{/if}
										</TableCell>
									{/if}
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				{:else}
					<p class="py-8 text-center text-sm text-muted-foreground">No members yet.</p>
				{/if}
			</CardContent>
		</Card>

		<!-- Invitations Section -->
		{#if $activeOrganization.data && $activeOrganization.data.invitations.length > 0}
			<Card class="mt-5">
				<CardHeader class="pb-1">
					<CardTitle>Pending Invitations</CardTitle>
					<CardDescription>Manage pending member invitations.</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Expires</TableHead>
								{#if isAdmin}
									<TableHead class="text-right">Actions</TableHead>
								{/if}
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each $activeOrganization.data.invitations as invitation (invitation.id)}
								<TableRow>
									<TableCell>
										<div class="flex items-center gap-2">
											<MailIcon class="size-4 text-muted-foreground" />
											<span class="truncate text-sm">{invitation.email}</span>
										</div>
									</TableCell>
									<TableCell>
										<Badge variant="outline">{invitation.role}</Badge>
									</TableCell>
									<TableCell>
										<span class="text-sm text-muted-foreground">
											{formatDate(invitation.expiresAt)}
										</span>
									</TableCell>
									{#if isAdmin}
										<TableCell class="text-right">
											<Button
												size="sm"
												variant="ghost"
												onclick={() => handleCancelInvitation(invitation.id)}
											>
												<XIcon class="size-4" />
											</Button>
										</TableCell>
									{/if}
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>

<!-- Invite Member Dialog -->
<Dialog.Root bind:open={showInviteDialog}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Invite Member</Dialog.Title>
			<Dialog.Description>
				Send an invitation to add a new member to your organization.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="email">Email Address</Label>
				<Input
					id="email"
					type="email"
					bind:value={inviteEmail}
					placeholder="colleague@example.com"
					disabled={isInviting}
				/>
			</div>

			<div class="grid gap-2">
				<Label for="role">Role</Label>
				<select
					id="role"
					bind:value={inviteRole}
					disabled={isInviting}
					class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				>
					<option value="member">Member</option>
					<option value="admin">Admin</option>
					{#if isOwner}
						<option value="owner">Owner</option>
					{/if}
				</select>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showInviteDialog = false)} disabled={isInviting}>
				Cancel
			</Button>
			<Button onclick={handleSendInvitation} disabled={isInviting || !inviteEmail}>
				{#if isInviting}
					Sending...
				{:else}
					<SendIcon class="mr-2 size-4" />
					Send Invitation
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Organization Confirmation -->
<AlertDialog.Root bind:open={showDeleteDialog}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
			<AlertDialog.Description>
				This action cannot be undone. This will permanently delete the organization
				<span class="font-semibold">{$activeOrganization.data?.name}</span> and remove all associated
				data.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={handleDeleteOrganization}
				class="text-destructive-foreground bg-destructive hover:bg-destructive/90"
			>
				Delete Organization
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
