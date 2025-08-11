import { organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/svelte';
import { stripeClient } from '@better-auth/stripe/client';

export const authClient = createAuthClient({
	plugins: [
		organizationClient(),
		stripeClient({
			subscription: true
		})
	]
});
