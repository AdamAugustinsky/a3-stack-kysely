import Stripe from 'stripe';

/**
 * Stripe seed script (idempotent)
 *
 * Goal
 * - Create a single "A3 Stack (Test)" product
 * - Create 3 subscription prices for it (monthly and annual where applicable)
 * - Be idempotent: re-running won't duplicate products/prices
 * - Print .env-ready variables with the created/reused Price IDs
 *
 * Usage
 *   1) Ensure STRIPE_SECRET_KEY (test mode) is set in your environment
 *      - e.g. export STRIPE_SECRET_KEY=sk_test_xxx
 *   2) bun run scripts/stripe-seed.ts
 *   3) Copy printed env vars into your .env.local / .env.development
 *
 * Notes
 * - We only rely on Stripe SDK and the runtime; no external deps beyond "stripe"
 * - We store a deterministic metadata.seedKey on the product/prices to find/reuse them
 */

// ---- Configuration (adjust amounts as needed) ----
const PRODUCT_NAME = 'A3 Stack (Test)';
const SEED_KEY = 'a3-stack-stripe-seed-v1'; // used to tag and re-find created items

// Define plans you want to provision
type PlanDef = {
	name: 'basic' | 'pro' | 'team';
	label: string; // human name for price nickname
	monthlyAmount: number; // USD cents
	annualAmount?: number; // USD cents, optional (team has only monthly here)
	// When true, we expect to pass seats as quantity in Checkout
	quantityBased?: boolean;
};

const PLANS: PlanDef[] = [
	{ name: 'basic', label: 'Basic', monthlyAmount: 900, annualAmount: 9000 },
	{ name: 'pro', label: 'Pro', monthlyAmount: 2900, annualAmount: 29000 },
	{ name: 'team', label: 'Team', monthlyAmount: 9900, quantityBased: true }
];

// ---- Helpers ----
function requireEnv(name: string): string {
	const v = process.env[name];
	if (!v) {
		throw new Error(
			`Missing required environment variable: ${name}. Set STRIPE_SECRET_KEY (test mode) before running.`
		);
	}
	return v;
}

function centsToDollars(cents: number): string {
	return (cents / 100).toFixed(2);
}

async function findOrCreateProduct(stripe: Stripe): Promise<Stripe.Product> {
	// First, try to find by metadata.seedKey to keep it deterministic
	const byMeta = await stripe.products.search({
		query: `metadata['seedKey']:'${SEED_KEY}' AND active:'true'`
	});
	if (byMeta.data[0]) return byMeta.data[0];

	// Fallback: try by exact name in active products
	const byName = await stripe.products.search({
		query: `name:'${PRODUCT_NAME.replace(/'/g, "\\'")}' AND active:'true'`
	});
	if (byName.data[0]) {
		// Patch metadata to mark as seeded
		if ((byName.data[0].metadata ?? {}).seedKey !== SEED_KEY) {
			await stripe.products.update(byName.data[0].id, {
				metadata: { ...(byName.data[0].metadata ?? {}), seedKey: SEED_KEY }
			});
		}
		return byName.data[0];
	}

	// Create new
	return await stripe.products.create({
		name: PRODUCT_NAME,
		active: true,
		metadata: { seedKey: SEED_KEY }
	});
}

type PriceSearchParams = {
	productId: string;
	unitAmount: number;
	interval: 'month' | 'year';
	nickname: string;
	quantityBased?: boolean;
};

async function findOrCreateRecurringPrice(
	stripe: Stripe,
	params: PriceSearchParams
): Promise<Stripe.Price> {
	// Search only by supported fields; filter client-side for unit amount
	const queryParts = [
		`active:'true'`,
		`type:'recurring'`,
		`product:'${params.productId}'`,
		`metadata['seedKey']:'${SEED_KEY}'`,
		`metadata['interval']:'${params.interval}'`,
		`metadata['planName']:'${params.nickname.toLowerCase()}'`
	];

	const search = await stripe.prices.search({ query: queryParts.join(' AND ') });
	const matched = search.data.find(
		(p) => p.unit_amount === params.unitAmount && p.recurring?.interval === params.interval
	);
	if (matched) return matched;

	// Not found; create it
	return await stripe.prices.create({
		currency: 'usd',
		unit_amount: params.unitAmount,
		recurring: {
			interval: params.interval,
			// quantityBased (team) means licensed quantity seats. We keep it standard recurring price.
			// Stripe quantity (seats) will be provided in Checkout as subscription item quantity.
			usage_type: 'licensed'
		},
		nickname: `${params.nickname} ${params.interval === 'month' ? 'Monthly' : 'Annual'} - $${centsToDollars(params.unitAmount)}`,
		product: params.productId,
		metadata: {
			seedKey: SEED_KEY,
			interval: params.interval,
			planName: params.nickname.toLowerCase(),
			quantityBased: params.quantityBased ? 'true' : 'false'
		}
	});
}

// ---- Main ----
async function main() {
	const secret = requireEnv('STRIPE_SECRET_KEY');
	const stripe = new Stripe(secret, {
		// Keep the default apiVersion from the SDK; it's compatible with ^18
		apiVersion: '2024-12-18.acacia'
	});

	// Ensure we are in test mode (for safety). Stripe SDK doesn't directly expose mode,
	// but test keys start with "sk_test_".
	if (!secret.startsWith('sk_test_')) {
		console.warn(
			"Warning: STRIPE_SECRET_KEY does not look like a test key. It's safer to seed in a Stripe test account."
		);
	}

	const product = await findOrCreateProduct(stripe);

	const envOutput: Record<string, string> = {};
	for (const plan of PLANS) {
		// monthly
		const monthly = await findOrCreateRecurringPrice(stripe, {
			productId: product.id,
			unitAmount: plan.monthlyAmount,
			interval: 'month',
			nickname: plan.label,
			quantityBased: plan.quantityBased
		});

		// annual (optional per plan)
		let annual: Stripe.Price | undefined;
		if (plan.annualAmount) {
			annual = await findOrCreateRecurringPrice(stripe, {
				productId: product.id,
				unitAmount: plan.annualAmount,
				interval: 'year',
				nickname: plan.label,
				quantityBased: plan.quantityBased
			});
		}

		// Assemble env variable names
		const upper = plan.name.toUpperCase();
		if (plan.name === 'team') {
			// Single price for team (monthly, quantity-based)
			envOutput[`STRIPE_PRICE_${upper}`] = monthly.id;
		} else {
			envOutput[`STRIPE_PRICE_${upper}`] = monthly.id;
			if (annual) {
				envOutput[`STRIPE_PRICE_${upper}_ANNUAL`] = annual.id;
			}
		}
	}

	// Nicely print result for copy-paste into .env
	const lines = [
		'# ----- Stripe seeded values (TEST) -----',
		`STRIPE_PRODUCT_NAME="${PRODUCT_NAME}"`,
		...Object.entries(envOutput).map(([k, v]) => `${k}=${v}`),
		'# Remember to set STRIPE_WEBHOOK_SECRET from `stripe listen` or dashboard webhooks.',
		'# Example:',
		'# STRIPE_WEBHOOK_SECRET=whsec_xxx',
		'# --------------------------------------'
	];

	console.log(lines.join('\n'));
}

// Run
main().catch((err) => {
	console.error('Stripe seed failed:', err);
	process.exit(1);
});
