<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { labels, statuses, priorities } from './data.js';
	import Label from '@/components/ui/label/label.svelte';
	import { createTodo } from '../todo.remote.js';
	import { isHttpError } from '@sveltejs/kit';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { isValidationError, extractFieldErrors } from '$lib/utils/validation-errors.js';
	import Input from '@/components/ui/input/input.svelte';

	let {
		open = $bindable()
	}: {
		open: boolean;
	} = $props();

	let createTodoError = $state<string | undefined>();
	let fieldErrors = $state<Record<string, string>>({});
	let isLoading = $state(false);

	// Reset form state when dialog closes
	$effect(() => {
		if (!open) {
			createTodoError = undefined;
			fieldErrors = {};
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[525px]">
		<Dialog.Header>
			<Dialog.Title>Create New Task</Dialog.Title>
			<Dialog.Description>
				Add a new task to your todo list. Fill in the details below.
			</Dialog.Description>
		</Dialog.Header>

		<form
			{...createTodo.enhance(async ({ submit }) => {
				createTodoError = undefined;
				fieldErrors = {};
				isLoading = true;
				try {
					await submit();
					// Success - close dialog and reset form
					open = false;
				} catch (error) {
					if (isHttpError(error)) {
						if (isValidationError(error.body)) {
							// Extract field-specific errors using helper function
							fieldErrors = extractFieldErrors(error.body.errors.nested);
							createTodoError = 'Please fix the errors below.';
						} else {
							// Handle other HTTP errors
							createTodoError = error.body.message;
						}
					} else {
						createTodoError = 'An unexpected error occurred. Please try again.';
					}
				} finally {
					isLoading = false;
				}
			})}
			class="mt-6 space-y-6"
		>
			{#if createTodoError}
				<Alert.Root variant="destructive">
					<CircleAlertIcon class="size-4" />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{createTodoError}</Alert.Description>
				</Alert.Root>
			{/if}
			<div>
				<Label for="task-title">Task Title <span class="text-destructive">*</span></Label>
				<Input id="task-title" placeholder="What needs to be done?" name="text" />
				{#if fieldErrors.text}
					<p class="mt-1 text-sm text-destructive">{fieldErrors.text}</p>
				{:else}
					<p class="text-sm text-muted-foreground">Give your task a clear, descriptive title.</p>
				{/if}
			</div>
			<div class="grid gap-4 sm:grid-cols-3">
				<div>
					<Label for="label">Label</Label>
					<Select.Root type="single" allowDeselect={false} name="label" value="feature">
						<Select.Trigger class="w-full {fieldErrors.label ? 'border-destructive' : ''}">
							<Badge variant="outline" class="font-normal" id="label">
								{labels.find((l) => l.value === 'feature')?.label}
							</Badge>
						</Select.Trigger>
						<Select.Content>
							{#each labels as label (label.value)}
								<Select.Item value={label.value}>
									<Badge variant="outline" class="font-normal">
										{label.label}
									</Badge>
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					{#if fieldErrors.label}
						<p class="mt-1 text-sm text-destructive">{fieldErrors.label}</p>
					{/if}
				</div>

				<div>
					<Label for="status">Status</Label>
					<Select.Root type="single" allowDeselect={false} name="status" value="todo">
						<Select.Trigger
							class="w-full {fieldErrors.status ? 'border-destructive' : ''}"
							id="status"
						>
							{@const currentStatus = statuses.find((s) => s.value === 'todo')}
							{#if currentStatus}
								<div class="flex items-center">
									<currentStatus.icon class="mr-2 h-4 w-4 text-muted-foreground" />
									<span>{currentStatus.label}</span>
								</div>
							{/if}
						</Select.Trigger>
						<Select.Content>
							{#each statuses as status (status.value)}
								<Select.Item value={status.value}>
									<div class="flex items-center">
										<status.icon class="mr-2 h-4 w-4 text-muted-foreground" />
										<span>{status.label}</span>
									</div>
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					{#if fieldErrors.status}
						<p class="mt-1 text-sm text-destructive">{fieldErrors.status}</p>
					{/if}
				</div>

				<div>
					<Label for="priority">Priority</Label>
					<Select.Root type="single" allowDeselect={false} name="priority" value="medium">
						<Select.Trigger
							class="w-full {fieldErrors.priority ? 'border-destructive' : ''}"
							id="priority"
						>
							{@const currentPriority = priorities.find((p) => p.value === 'medium')}
							{#if currentPriority}
								<div class="flex items-center">
									<currentPriority.icon class="mr-2 h-4 w-4 text-muted-foreground" />
									<span>{currentPriority.label}</span>
								</div>
							{/if}
						</Select.Trigger>
						<Select.Content>
							{#each priorities as priority (priority.value)}
								<Select.Item value={priority.value}>
									<div class="flex items-center">
										<priority.icon class="mr-2 h-4 w-4 text-muted-foreground" />
										<span>{priority.label}</span>
									</div>
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					{#if fieldErrors.priority}
						<p class="mt-1 text-sm text-destructive">{fieldErrors.priority}</p>
					{/if}
				</div>
			</div>

			<Dialog.Footer class="gap-2">
				<Button type="button" variant="outline" onclick={() => (open = false)}>Cancel</Button>
				<Button type="submit" disabled={isLoading}>
					{#if isLoading}
						<div
							class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"
						></div>
						Creating...
					{:else}
						Create task
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
