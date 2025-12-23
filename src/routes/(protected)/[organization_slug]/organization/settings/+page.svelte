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
	import { toast } from 'svelte-sonner';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
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

	import CrownIcon from '@tabler/icons-svelte/icons/crown';
	import UserPlusIcon from '@tabler/icons-svelte/icons/user-plus';
	import {
		updateOrganization,
		deleteOrganization,
		inviteMember,
		updateMemberRole,
		removeMember,
		cancelInvitation,
		setActiveOrganization
	} from '$lib/remote/organization.remote';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Reactive organization data from page data
	const activeOrganization = $derived(data.activeOrganization);
	const user = $derived(data.user);

	// Organization details state
	let isEditing = $state(false);
	let isSaving = $state(false);

	// Form state
	let nameValue = $state('');
	let slugValue = $state('');
	let logoValue = $state('');

	// Track if slug was manually edited
	let slugManuallyEdited = $state(false);

	// Auto-generate slug from name (same logic as create form)
	function generateSlug(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}

	// Handle name input change
	function handleNameChange(e: Event) {
		const input = e.target as HTMLInputElement;
		nameValue = input.value;

		// Auto-generate slug if not manually edited
		if (!slugManuallyEdited) {
			slugValue = generateSlug(nameValue);
		}
	}

	// Handle slug input change
	function handleSlugChange(e: Event) {
		const input = e.target as HTMLInputElement;
		slugValue = input.value;
		slugManuallyEdited = true;
	}

	// UI state
	let showInviteDialog = $state(false);
	let showDeleteDialog = $state(false);

	// Invitation form state
	let inviteEmail = $state('');
	let inviteRole = $state<'member' | 'admin' | 'owner'>('member');
	let isInviting = $state(false);

	// Current user's role in the organization
	const currentUserRole = $derived.by(() => {
		if (!activeOrganization || !user) return '';
		const member = activeOrganization.members?.find((m) => m.userId === user.id);
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
			toast.success('Copied to clipboard.');
		} catch {
			toast.error('Failed to copy.');
		}
	}

	// Save organization details
	async function handleSaveDetails() {
		if (!activeOrganization) return;

		isSaving = true;

		const oldSlug = activeOrganization.slug;
		const newSlug = slugValue;

		try {
			await updateOrganization({
				organizationId: activeOrganization.id,
				data: {
					name: nameValue,
					slug: newSlug,
					logo: logoValue || undefined
				}
			});

			toast.success('Organization details updated successfully.');
			isEditing = false;
			slugManuallyEdited = false;

			// Redirect to new slug if it changed
			if (newSlug && newSlug !== oldSlug) {
				goto(
					resolve('/(protected)/[organization_slug]/organization/settings', {
						organization_slug: newSlug
					})
				);
			} else {
				await invalidateAll();
			}
		} catch (error) {
			toast.error('Failed to update organization details.');
			console.error('Failed to save organization:', error);
		} finally {
			isSaving = false;
		}
	}

	// Cancel editing
	function handleCancelEdit() {
		if (!activeOrganization) return;
		nameValue = activeOrganization.name;
		slugValue = activeOrganization.slug || '';
		logoValue = activeOrganization.logo || '';
		isEditing = false;
		slugManuallyEdited = false;
	}

	// Send invitation
	async function handleSendInvitation() {
		if (!inviteEmail || !activeOrganization) return;

		isInviting = true;
		try {
			await inviteMember({
				email: inviteEmail,
				role: inviteRole,
				organizationId: activeOrganization.id
			});

			showInviteDialog = false;
			inviteEmail = '';
			inviteRole = 'member';
			toast.success('Invitation sent successfully.');
			await invalidateAll();
		} catch (error) {
			toast.error('Failed to send invitation.');
			console.error('Failed to send invitation:', error);
		} finally {
			isInviting = false;
		}
	}

	// Cancel invitation
	async function handleCancelInvitation(invitationId: string) {
		try {
			await cancelInvitation({ invitationId });
			toast.success('Invitation cancelled.');
			await invalidateAll();
		} catch (error) {
			toast.error('Failed to cancel invitation.');
			console.error('Failed to cancel invitation:', error);
		}
	}

	// Update member role
	async function handleUpdateMemberRole(memberId: string, newRole: 'member' | 'admin' | 'owner') {
		if (!activeOrganization) return;

		try {
			await updateMemberRole({
				memberId,
				role: newRole,
				organizationId: activeOrganization.id
			});
			toast.success('Member role updated.');
			await invalidateAll();
		} catch (error) {
			toast.error('Failed to update member role.');
			console.error('Failed to update member role:', error);
		}
	}

	// Remove member
	async function handleRemoveMember(memberId: string, userEmail: string) {
		if (!activeOrganization) return;

		try {
			await removeMember({
				memberIdOrEmail: userEmail,
				organizationId: activeOrganization.id
			});
			toast.success('Member removed from organization.');
			await invalidateAll();
		} catch (error) {
			toast.error('Failed to remove member.');
			console.error('Failed to remove member:', error);
		}
	}

	// Delete organization
	async function handleDeleteOrganization() {
		if (!activeOrganization) return;

		try {
			await deleteOrganization({
				organizationId: activeOrganization.id
			});

			// Clear active organization and redirect
			await setActiveOrganization({ organizationId: null });
			await invalidateAll();

			goto('/sign-in');
		} catch (error) {
			toast.error('Failed to delete organization.');
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

<div class="@container/main hidden h-full flex-1 flex-col gap-8 p-8 md:flex">
	<div class="flex items-center justify-between gap-3">
		<div class="flex flex-col gap-1">
			<h2 class="text-2xl font-semibold tracking-tight">Organization</h2>
			<p class="text-muted-foreground">Manage your organization, members, and permissions.</p>
		</div>
		{#if isAdmin && !isEditing}
			<Button
				variant="outline"
				size="sm"
				onclick={() => {
					if (activeOrganization) {
						nameValue = activeOrganization.name;
						slugValue = activeOrganization.slug || '';
						logoValue = activeOrganization.logo || '';
						slugManuallyEdited = false;
					}
					isEditing = true;
				}}
			>
				<BuildingIcon class="mr-2 size-4 shrink-0" />
				<span class="truncate">Edit organization</span>
			</Button>
		{/if}
	</div>

	{#if activeOrganization}
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Left: Organization Details -->
			<Card class="gap-4 py-4 shadow-xs md:col-span-2">
				<CardHeader class="px-5 pb-0">
					<div class="flex items-center gap-4">
						<Avatar class="size-16 shrink-0 sm:size-20">
							{#if activeOrganization.logo}
								<AvatarImage
									src={activeOrganization.logo}
									alt={activeOrganization.name}
								/>
							{/if}
							<AvatarFallback class="text-base sm:text-lg">
								{activeOrganization.name.slice(0, 2).toUpperCase()}
							</AvatarFallback>
						</Avatar>
						<div class="min-w-0 space-y-1">
							<CardTitle class="truncate text-lg font-semibold">{activeOrganization.name}</CardTitle>
							{#if activeOrganization.slug}
								<CardDescription class="truncate font-mono text-sm text-muted-foreground">
									/{activeOrganization.slug}
								</CardDescription>
							{/if}
						</div>
					</div>
				</CardHeader>

				<CardContent class="space-y-4 px-5">
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
									value={nameValue}
									oninput={handleNameChange}
									placeholder="Enter organization name"
									disabled={isSaving}
								/>
							{:else}
								<div class="flex items-center space-x-2 py-1">
									<BuildingIcon class="size-4 shrink-0 text-muted-foreground" />
									<span class="truncate text-sm">{activeOrganization.name}</span>
								</div>
							{/if}
						</div>

						<!-- Slug Field -->
						<div class="grid gap-2">
							<Label for="slug">Organization Slug</Label>
							{#if isEditing}
								<Input
									id="slug"
									value={slugValue}
									oninput={handleSlugChange}
									placeholder="organization-slug"
									disabled={isSaving}
								/>
								<p class="text-xs text-muted-foreground">
									Used in URLs and must be unique. Only lowercase letters, numbers, and hyphens.
								</p>
							{:else}
								<div class="flex items-center space-x-2 py-1">
									<span class="truncate font-mono text-sm"
										>/{activeOrganization.slug || 'no-slug'}</span
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
							{:else if activeOrganization.logo}
								<div class="flex items-center space-x-2 py-1">
									<span class="truncate text-sm">{activeOrganization.logo}</span>
								</div>
							{:else}
								<span class="text-sm text-muted-foreground">No logo set</span>
							{/if}
						</div>

						<!-- Action Buttons (only show when editing) -->
						{#if isEditing}
							<div class="flex flex-col gap-2 pt-2 sm:flex-row">
								<Button size="sm" onclick={handleSaveDetails} disabled={isSaving}>
									{isSaving ? 'Saving…' : 'Save changes'}
								</Button>
								<Button size="sm" variant="outline" onclick={handleCancelEdit} disabled={isSaving}>
									Cancel
								</Button>
							</div>
						{/if}
					</div>
				</CardContent>
			</Card>

			<!-- Right: Meta and Actions -->
			<div class="space-y-6">
				<Card class="gap-4 py-4 shadow-xs">
					<CardHeader class="px-5 pb-0">
						<CardTitle>Organization Info</CardTitle>
						<CardDescription>Identifiers and metadata.</CardDescription>
					</CardHeader>
					<CardContent class="space-y-2 px-5">
						<div class="flex items-center justify-between gap-3 py-1">
							<div class="flex min-w-0 items-center space-x-2">
								<CalendarIcon class="size-4 shrink-0 text-muted-foreground" />
								<span class="text-sm font-medium">Created</span>
							</div>
							<span class="truncate text-sm text-muted-foreground">
								{formatDate(activeOrganization.createdAt)}
							</span>
						</div>

						<div class="flex items-center justify-between gap-3 py-1">
							<div class="flex min-w-0 items-center space-x-2">
								<ShieldIcon class="size-4 shrink-0 text-muted-foreground" />
								<span class="text-sm font-medium">Org ID</span>
							</div>
							<div class="flex max-w-[65%] items-center gap-2">
								<span class="truncate font-mono text-xs text-muted-foreground">
									{activeOrganization.id}
								</span>
								<Button
									size="sm"
									variant="outline"
									class="shrink-0"
									onclick={() => copy(activeOrganization?.id ?? '')}
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
								{activeOrganization?.members.length}
								{activeOrganization?.members.length === 1 ? 'member' : 'members'}
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
					<Card class="gap-4 py-4 shadow-xs border-destructive">
						<CardHeader class="px-5 pb-0">
							<CardTitle class="text-destructive">Danger Zone</CardTitle>
							<CardDescription>Irreversible and destructive actions.</CardDescription>
						</CardHeader>
						<CardContent class="px-5">
							<div class="space-y-4">
								<div class="flex items-center justify-between">
									<div class="space-y-1">
										<p class="text-sm font-medium">Delete Organization</p>
										<p class="text-xs text-muted-foreground">
											Permanently delete this organization and all data.
										</p>
									</div>
										<Button size="sm" variant="destructive" onclick={() => (showDeleteDialog = true)}>
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
		<Card class="gap-4 py-4 shadow-xs">
			<CardHeader class="px-5 pb-0">
				<div class="flex items-center justify-between">
					<div>
						<CardTitle>Members</CardTitle>
						<CardDescription>Manage organization members and their roles.</CardDescription>
					</div>
					{#if isAdmin}
						<Button size="sm" onclick={() => (showInviteDialog = true)}>
							<UserPlusIcon class="mr-2 size-4" />
							Invite Member
						</Button>
					{/if}
				</div>
			</CardHeader>
			<CardContent>
				{#if activeOrganization?.members.length > 0}
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
							{#each activeOrganization?.members as member (member.id)}
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
										{#if isOwner && member.userId !== user?.id && member.role !== 'owner'}
											<select
												value={member.role}
												onchange={(e) =>
													handleUpdateMemberRole(
														member.id,
														e.currentTarget.value as 'member' | 'admin' | 'owner'
													)}
												class="flex h-8 w-25 items-center justify-between rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
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
											{#if member.userId !== user?.id && member.role !== 'owner'}
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
		{#if activeOrganization && activeOrganization.invitations.length > 0}
			<Card class="gap-4 py-4 shadow-xs">
				<CardHeader class="px-5 pb-0">
					<CardTitle>Pending invitations</CardTitle>
					<CardDescription>Manage pending member invitations.</CardDescription>
				</CardHeader>
				<CardContent class="px-5">
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
							{#each activeOrganization.invitations as invitation (invitation.id)}
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
	<Dialog.Content class="gap-0 p-0 sm:max-w-md">
		<Dialog.Header class="border-b px-5 py-3.5">
			<Dialog.Title class="text-base font-semibold">Invite member</Dialog.Title>
			<Dialog.Description class="text-sm text-muted-foreground">
				Send an invitation to add someone to your organization.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-3.5 px-5 py-4">
			<div class="grid gap-2">
				<Label for="email">Email</Label>
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

		<Dialog.Footer class="border-t bg-muted/30 px-5 py-3">
			<Button size="sm" variant="ghost" onclick={() => (showInviteDialog = false)} disabled={isInviting}>
				Cancel
			</Button>
			<Button size="sm" onclick={handleSendInvitation} disabled={isInviting || !inviteEmail}>
				{#if isInviting}
					Sending...
				{:else}
					<SendIcon class="mr-2 size-4" />
					Send invitation
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
				<span class="font-semibold">{activeOrganization?.name}</span> and remove all associated
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
