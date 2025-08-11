import { betterAuth } from 'better-auth';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { organization } from 'better-auth/plugins';
import { Pool } from 'pg';
import { getRequestEvent } from '$app/server';

// if (!Bun.env.STRIPE_SECRET_KEY) {
// 	throw new Error('STRIPE_SECRET_KEY is not defined');
// }

// if (!Bun.env.STRIPE_WEBHOOK_SECRET) {
// 	throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
// }

// const stripeClient = new Stripe(Bun.env.STRIPE_SECRET_KEY, {
// 	apiVersion: '2025-07-30.basil'
// });

export const auth = betterAuth({
	database: new Pool({
		connectionString: process.env.DATABASE_URL
	}),
	emailAndPassword: {
		enabled: true
	},
	plugins: [
		sveltekitCookies(getRequestEvent),
		organization()
		// stripe({
		// 	stripeClient,
		// 	stripeWebhookSecret: Bun.env.STRIPE_WEBHOOK_SECRET,
		// 	createCustomerOnSignUp: true,
		// 	subscription: {
		// 		enabled: true,
		// 		plans: [
		// 			{
		// 				name: 'free',
		// 				priceId: '', // Free plan doesn't need a price ID
		// 				limits: {
		// 					projects: 3,
		// 					members: 2,
		// 					storage: 1 // GB
		// 				}
		// 			},
		// 			{
		// 				name: 'starter',
		// 				priceId: Bun.env.STRIPE_PRICE_BASIC!,
		// 				annualDiscountPriceId: Bun.env.STRIPE_PRICE_BASIC_ANNUAL!,
		// 				limits: {
		// 					projects: 10,
		// 					members: 5,
		// 					storage: 10 // GB
		// 				}
		// 			},
		// 			{
		// 				name: 'pro',
		// 				priceId: Bun.env.STRIPE_PRICE_PRO!,
		// 				annualDiscountPriceId: Bun.env.STRIPE_PRICE_PRO_ANNUAL!,
		// 				limits: {
		// 					projects: 50,
		// 					members: 20,
		// 					storage: 100 // GB
		// 				},
		// 				freeTrial: {
		// 					days: 14
		// 				}
		// 			},
		// 			{
		// 				name: 'enterprise',
		// 				priceId: Bun.env.STRIPE_PRICE_TEAM!, // Using team price for enterprise
		// 				annualDiscountPriceId: Bun.env.STRIPE_PRICE_TEAM!, // No separate annual price for team
		// 				limits: {
		// 					projects: -1, // unlimited
		// 					members: -1, // unlimited
		// 					storage: 1000 // GB
		// 				}
		// 			}
		// 		],
		// 		authorizeReference: async ({ user, referenceId }) => {
		// 			// Allow users to manage their own subscriptions
		// 			if (referenceId === user.id) {
		// 				return true;
		// 			}

		// 			// For organizations, check if user is an owner or admin
		// 			const member = await db.query.member.findFirst({
		// 				where: (member, { and, eq }) =>
		// 					and(eq(member.userId, user.id), eq(member.organizationId, referenceId))
		// 			});

		// 			return member?.role === 'owner' || member?.role === 'admin';
		// 		}
		// 	}
		// })
	]
});
