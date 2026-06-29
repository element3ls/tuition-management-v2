# Billing Later Plan

Billing is intentionally not enforced in the app yet. The SaaS-ready foundation now records billing state on each tenant, while access remains controlled by organization status, roles, memberships, and permissions.

## Current State

Each organization has these billing-ready fields:

- `billing_status`
- `billing_plan`
- `billing_email`
- `stripe_customer_id`
- `stripe_subscription_id`
- `trial_ends_at`
- `current_period_ends_at`

Default tenants use:

- `billing_status = manual`
- `billing_plan = mvp`

`manual` means the tenant is allowed to operate without an automated payment provider. This supports MVP pilots, direct invoicing, and customer validation before adding Stripe.

## What Is Not Built Yet

- No Stripe checkout.
- No customer portal.
- No webhook handler for billing events.
- No automatic suspension for failed payments.
- No plan-based feature limits.
- No per-tenant invoice UI.

## Future Stripe Rollout

When billing becomes necessary:

1. Add Stripe environment variables:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - plan price ids such as `STRIPE_PRICE_PRO_MONTHLY`
2. Create a checkout route for tenant owners.
3. Store Stripe customer and subscription ids on `organizations`.
4. Add a Stripe webhook route that updates `billing_status`, `current_period_ends_at`, and `trial_ends_at`.
5. Add an owner-only billing page under admin settings.
6. Decide enforcement rules.

Recommended first enforcement rule:

- Keep product access based on `organizations.status`.
- Let billing automation move unpaid tenants to `status = suspended` only after a grace period and admin review.

This avoids surprise lockouts while the SaaS is still young.

## Plan and Entitlement Direction

Use `billing_plan` as the stable internal entitlement key. Keep it separate from Stripe price ids so prices can change without changing app logic.

Suggested early plan keys:

- `mvp`
- `starter`
- `pro`
- `enterprise`

Feature limits should be resolved from app-owned plan keys, not directly from Stripe price ids.
