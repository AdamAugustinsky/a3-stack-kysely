<script lang="ts">
	import { cn } from '$lib/utils.js';
	import type { Component } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLElement> & {
		content?: string | Component;
		class?: string;
		variant?: 'default' | 'onPrimary';
	};

	let { content, class: className, variant = 'default', children, ...restProps }: Props = $props();

	const baseClass =
		'pointer-events-none inline-flex h-5 select-none items-center justify-center gap-1 rounded border px-1 font-sans text-[0.7rem] font-medium [&_svg:not([class*="size-"])]:size-3 shadow-xs';
	const defaultClass =
		'border-neutral-200/60 bg-background/80 text-muted-foreground dark:border-neutral-700/50';
	const onPrimaryClass =
		'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30';
	$effect(() => {
		void variant; // keep reactive if parent changes variant
	});
</script>

{#if content}
	{@const Content = content}
	<kbd
		class={cn(baseClass, variant === 'onPrimary' ? onPrimaryClass : defaultClass, className)}
		{...restProps}
	>
		{#if typeof Content === 'string'}
			{Content}
		{:else}
			<Content />
		{/if}
	</kbd>
{:else}
	<kbd
		class={cn(baseClass, variant === 'onPrimary' ? onPrimaryClass : defaultClass, className)}
		{...restProps}
	>
		{@render children?.()}
	</kbd>
{/if}
