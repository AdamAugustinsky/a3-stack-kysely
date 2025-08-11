<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { authClient } from '$lib/auth-client';
	import CheckIcon from '@tabler/icons-svelte/icons/check';
	import InfoCircleIcon from '@tabler/icons-svelte/icons/info-circle';
	import CreditCardIcon from '@tabler/icons-svelte/icons/credit-card';
	import CalendarIcon from '@tabler/icons-svelte/icons/calendar';
	import UsersIcon from '@tabler/icons-svelte/icons/users';
	import DatabaseIcon from '@tabler/icons-svelte/icons/database';
	import BuildingIcon from '@tabler/icons-svelte/icons/building';
	import { page } from '$app/state';

	import type { Subscription } from '@better-auth/stripe';

	let subscription = $state<Subscription | null>(null);
	let loading = $state(true);
	let upgrading = $state(false);
	let errorMessage = $state<string | null>(null);

	// Use Better Auth's client-side active organization hook
	const activeOrganization = authClient.useActiveOrganization();

	const plans = [
		{
			name: 'free',
			displayName: 'Free',
			price: '$0',
			period: 'forever',
			features: ['Up to 3 projects', 'Up to 2 team members', '1 GB storage', 'Community support'],
			limits: {
				projects: 3,
				members: 2,
				storage: 1
			}
		},
		{
			name: 'starter',
			displayName: 'Starter',
			price: '$19',
			period: 'per month',
			annualPrice: '$190',
			features: [
				'Up to 10 projects',
				'Up to 5 team members',
				'10 GB storage',
				'Email support',
				'Custom branding'
			],
			limits: {
				projects: 10,
				members: 5,
				storage: 10
			}
		},
		{
			name: 'pro',
			displayName: 'Pro',
			price: '$49',
			period: 'per month',
			annualPrice: '$490',
			features: [
				'Up to 50 projects',
				'Up to 20 team members',
				'100 GB storage',
				'Priority support',
				'Advanced analytics',
				'API access',
				'14-day free trial'
			],
			limits: {
				projects: 50,
				members: 20,
				storage: 100
			},
			popular: true
		},
		{
			name: 'enterprise',
			displayName: 'Enterprise',
			price: '$199',
			period: 'per month',
			annualPrice: '$1990',
			features: [
				'Unlimited projects',
				'Unlimited team members',
				'1 TB storage',
				'24/7 phone support',
				'Custom integrations',
				'SLA guarantee',
				'Dedicated account manager'
			],
			limits: {
				projects: -1,
				members: -1,
				storage: 1000
			}
		}
	];

	let billingPeriod = $state<'monthly' | 'annual'>('monthly');

	async function loadData() {
		const activeOrg = $activeOrganization.data;
		if (!activeOrg) return;

		try {
			loading = true;
			errorMessage = null;

			// Get subscription for the organization
			const { data: subscriptions, error } = await authClient.subscription.list({
				query: {
					referenceId: activeOrg.id
				}
			});

			if (error) {
				console.error('Failed to fetch subscriptions:', error);
				errorMessage = 'Failed to load subscription information';
				return;
			}

			// Find active or trialing subscription
			subscription =
				subscriptions?.find((sub) => sub.status === 'active' || sub.status === 'trialing') || null;
		} catch (error) {
			console.error('Failed to load billing data:', error);
			errorMessage = 'Failed to load billing information';
		} finally {
			loading = false;
		}
	}

	async function handleUpgrade(planName: string) {
		const activeOrg = $activeOrganization.data;
		if (!activeOrg) return;

		try {
			upgrading = true;
			errorMessage = null;

			const isAnnual = billingPeriod === 'annual';
			const orgSlug = page.params.organization_slug;
			const successUrl = `${window.location.origin}/${orgSlug}/organization/billing?upgraded=true`;
			const cancelUrl = `${window.location.origin}/${orgSlug}/organization/billing`;

			const { error } = await authClient.subscription.upgrade({
				plan: planName,
				referenceId: activeOrg.id,
				successUrl,
				cancelUrl,
				annual: isAnnual,
				subscriptionId: subscription?.stripeSubscriptionId || undefined
			});

			if (error) {
				console.error('Upgrade failed:', error);
				if (error.message?.includes('portal configuration')) {
					errorMessage =
						'Stripe Customer Portal is not properly configured. Please contact support.';
				} else {
					errorMessage = error.message || 'Failed to start upgrade process';
				}
			}
		} finally {
			upgrading = false;
		}
	}

	async function handleManageBilling() {
		const activeOrg = $activeOrganization.data;
		if (!activeOrg) return;

		// Check if there's an active subscription
		if (!subscription || !subscription.stripeCustomerId) {
			errorMessage = 'No active subscription found. Please upgrade to a paid plan first.';
			return;
		}

		try {
			// Use Better Auth's subscription.cancel method which opens the billing portal
			const { error } = await authClient.subscription.cancel({
				referenceId: activeOrg.id,
				subscriptionId: subscription.stripeSubscriptionId,
				returnUrl: `${window.location.origin}/${page.params.organization_slug}/organization/billing`
			});

			if (error) {
				console.error('Failed to open billing portal:', error);
				if (error.message?.includes('portal configuration')) {
					errorMessage =
						'Stripe Customer Portal configuration is incomplete. Please contact support to enable billing management features.';
				} else if (
					error.message?.includes('No customer found') ||
					error.message?.includes('not found')
				) {
					errorMessage = 'No billing information found. Please upgrade to a paid plan first.';
				} else {
					errorMessage = error.message || 'Failed to open billing portal';
				}
			}
		} catch (error) {
			console.error('Failed to open billing portal:', error);
			errorMessage = 'Failed to open billing portal';
		}
	}

	// Load data when active organization changes and check for upgrade success
	$effect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		if (urlParams.get('upgraded') === 'true') {
			// Remove the query parameter
			window.history.replaceState({}, '', `/${page.params.organization_slug}/organization/billing`);
		}

		// Only load data if we have an active organization
		if ($activeOrganization.data) {
			loadData();
		}
	});

	function getPlanDisplayPrice(plan: {
		name: string;
		price: string;
		period: string;
		annualPrice?: string;
	}) {
		if (billingPeriod === 'annual' && plan.annualPrice) {
			return plan.annualPrice + ' per year';
		}
		return plan.price + ' ' + plan.period;
	}

	function isCurrentPlan(planName: string): boolean {
		if (!subscription) return planName === 'free';
		return subscription.plan === planName;
	}
</script>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold">Billing & Subscription</h1>
		<p class="mt-2 text-muted-foreground">
			Manage your organization's subscription and billing details
		</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div
					class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"
				></div>
				<p class="text-muted-foreground">Loading billing information...</p>
			</div>
		</div>
	{:else if errorMessage}
		<Alert.Root variant="destructive">
			<InfoCircleIcon class="h-4 w-4" />
			<Alert.Title>Configuration Required</Alert.Title>
			<Alert.Description>
				{errorMessage}
				{#if errorMessage.includes('portal configuration')}
					<br /><br />
					<strong>To fix this:</strong>
					<br />1. Go to your Stripe Dashboard
					<br />2. Navigate to Settings → Billing → Customer Portal
					<br />3. Enable "Update subscription" and "Cancel subscription" features
					<br />4. Save the configuration
				{/if}
			</Alert.Description>
		</Alert.Root>
	{:else if $activeOrganization.data}
		<!-- Current Plan Overview -->
		<Card.Root class="mb-8">
			<Card.Header>
				<div class="flex items-center justify-between">
					<div>
						<Card.Title class="flex items-center gap-2">
							<BuildingIcon class="h-5 w-5" />
							{$activeOrganization.data.name}
						</Card.Title>
						<Card.Description>Current subscription status</Card.Description>
					</div>
					{#if subscription}
						<Badge variant={subscription.status === 'trialing' ? 'secondary' : 'default'}>
							{subscription.status}
						</Badge>
					{:else}
						<Badge variant="secondary">Free Plan</Badge>
					{/if}
				</div>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-4 md:grid-cols-3">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-muted p-2">
							<CreditCardIcon class="h-5 w-5 text-muted-foreground" />
						</div>
						<div>
							<p class="text-sm font-medium">Current Plan</p>
							<p class="text-2xl font-bold">
								{subscription
									? plans.find((p) => p.name === subscription!.plan)?.displayName
									: 'Free'}
							</p>
						</div>
					</div>

					{#if subscription?.periodEnd}
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-muted p-2">
								<CalendarIcon class="h-5 w-5 text-muted-foreground" />
							</div>
							<div>
								<p class="text-sm font-medium">
									{subscription.cancelAtPeriodEnd ? 'Expires' : 'Renews'} on
								</p>
								<p class="text-lg font-semibold">
									{new Date(subscription.periodEnd).toLocaleDateString()}
								</p>
							</div>
						</div>
					{/if}

					{#if subscription && subscription.stripeCustomerId}
						<div class="flex items-center justify-end gap-2">
							<Button variant="outline" onclick={handleManageBilling}>Manage Billing</Button>
						</div>
					{:else if !subscription}
						<div class="flex items-center justify-end gap-2">
							<p class="text-sm text-muted-foreground">Upgrade to a paid plan to manage billing</p>
						</div>
					{/if}
				</div>

				{#if subscription?.cancelAtPeriodEnd}
					<Alert.Root class="mt-4" variant="destructive">
						<InfoCircleIcon class="h-4 w-4" />
						<Alert.Title>Subscription Ending</Alert.Title>
						<Alert.Description>
							Your subscription will end on {subscription.periodEnd
								? new Date(subscription.periodEnd).toLocaleDateString()
								: 'N/A'}. You'll be downgraded to the free plan after this date.
						</Alert.Description>
					</Alert.Root>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Billing Period Toggle -->
		<div class="mb-6 flex justify-center">
			<div class="inline-flex rounded-lg bg-muted p-1">
				<button
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors {billingPeriod ===
					'monthly'
						? 'bg-background shadow-sm'
						: ''}"
					onclick={() => (billingPeriod = 'monthly')}
				>
					Monthly
				</button>
				<button
					class="rounded-md px-4 py-2 text-sm font-medium transition-colors {billingPeriod ===
					'annual'
						? 'bg-background shadow-sm'
						: ''}"
					onclick={() => (billingPeriod = 'annual')}
				>
					Annual
					<span class="ml-1 text-xs text-muted-foreground">(Save 20%)</span>
				</button>
			</div>
		</div>

		<!-- Pricing Plans -->
		<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
			{#each plans as plan (plan.name)}
				<Card.Root class="relative {plan.popular ? 'border-primary shadow-lg' : ''}">
					{#if plan.popular}
						<div class="absolute -top-3 left-1/2 -translate-x-1/2">
							<Badge>Most Popular</Badge>
						</div>
					{/if}

					<Card.Header>
						<Card.Title>{plan.displayName}</Card.Title>
						<div class="mt-4">
							<span class="text-3xl font-bold">{getPlanDisplayPrice(plan).split(' ')[0]}</span>
							<span class="ml-2 text-muted-foreground">
								{getPlanDisplayPrice(plan).split(' ').slice(1).join(' ')}
							</span>
						</div>
					</Card.Header>

					<Card.Content>
						<ul class="space-y-3">
							{#each plan.features as feature (feature)}
								<li class="flex items-start gap-2">
									<CheckIcon class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
									<span class="text-sm">{feature}</span>
								</li>
							{/each}
						</ul>
					</Card.Content>

					<Card.Footer>
						{#if isCurrentPlan(plan.name)}
							<Button class="w-full" disabled>Current Plan</Button>
						{:else}
							<Button
								class="w-full"
								variant={plan.name === 'free' ? 'outline' : 'default'}
								onclick={() => handleUpgrade(plan.name)}
								disabled={upgrading || plan.name === 'free'}
							>
								{plan.name === 'free' ? 'Downgrade' : 'Upgrade'}
							</Button>
						{/if}
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>

		<!-- Usage Overview -->
		<Card.Root class="mt-8">
			<Card.Header>
				<Card.Title>Current Usage</Card.Title>
				<Card.Description>Your organization's resource usage this billing period</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="grid gap-6 md:grid-cols-3">
					<div>
						<div class="mb-2 flex items-center justify-between">
							<span class="flex items-center gap-2 text-sm font-medium">
								<DatabaseIcon class="h-4 w-4" />
								Projects
							</span>
							<span class="text-sm text-muted-foreground">
								0 / {subscription
									? plans.find((p) => p.name === subscription!.plan)?.limits.projects || 3
									: 3}
							</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-muted">
							<div class="h-full rounded-full bg-primary" style="width: 0%"></div>
						</div>
					</div>

					<div>
						<div class="mb-2 flex items-center justify-between">
							<span class="flex items-center gap-2 text-sm font-medium">
								<UsersIcon class="h-4 w-4" />
								Team Members
							</span>
							<span class="text-sm text-muted-foreground">
								1 / {subscription
									? plans.find((p) => p.name === subscription!.plan)?.limits.members || 2
									: 2}
							</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-muted">
							<div class="h-full rounded-full bg-primary" style="width: 50%"></div>
						</div>
					</div>

					<div>
						<div class="mb-2 flex items-center justify-between">
							<span class="flex items-center gap-2 text-sm font-medium">
								<DatabaseIcon class="h-4 w-4" />
								Storage
							</span>
							<span class="text-sm text-muted-foreground">
								0 GB / {subscription
									? plans.find((p) => p.name === subscription!.plan)?.limits.storage || 1
									: 1} GB
							</span>
						</div>
						<div class="h-2 overflow-hidden rounded-full bg-muted">
							<div class="h-full rounded-full bg-primary" style="width: 0%"></div>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
