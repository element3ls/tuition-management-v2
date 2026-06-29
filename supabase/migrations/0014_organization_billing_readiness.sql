alter table public.organizations add column if not exists billing_status text;
alter table public.organizations add column if not exists billing_plan text;
alter table public.organizations add column if not exists billing_email text;
alter table public.organizations add column if not exists stripe_customer_id text;
alter table public.organizations add column if not exists stripe_subscription_id text;
alter table public.organizations add column if not exists trial_ends_at timestamptz;
alter table public.organizations add column if not exists current_period_ends_at timestamptz;

update public.organizations
set billing_status = coalesce(billing_status, 'manual'),
    billing_plan = coalesce(nullif(trim(billing_plan), ''), 'mvp');

alter table public.organizations alter column billing_status set default 'manual';
alter table public.organizations alter column billing_plan set default 'mvp';
alter table public.organizations alter column billing_status set not null;
alter table public.organizations alter column billing_plan set not null;

alter table public.organizations drop constraint if exists organizations_billing_status_check;
alter table public.organizations add constraint organizations_billing_status_check
  check (billing_status in ('manual', 'trialing', 'active', 'past_due', 'paused', 'canceled', 'unpaid'));

alter table public.organizations drop constraint if exists organizations_billing_plan_check;
alter table public.organizations add constraint organizations_billing_plan_check
  check (length(trim(billing_plan)) > 0);

create index if not exists idx_organizations_billing_status on public.organizations(billing_status);
create unique index if not exists idx_organizations_stripe_customer_id
  on public.organizations(stripe_customer_id)
  where stripe_customer_id is not null;
create unique index if not exists idx_organizations_stripe_subscription_id
  on public.organizations(stripe_subscription_id)
  where stripe_subscription_id is not null;

comment on column public.organizations.billing_status is
  'Internal SaaS billing state. Not currently used to gate product access.';
comment on column public.organizations.billing_plan is
  'Internal plan identifier for future SaaS billing and entitlements.';
comment on column public.organizations.billing_email is
  'Billing contact email for invoices or payment provider handoff.';
comment on column public.organizations.stripe_customer_id is
  'Future Stripe customer identifier. Nullable until payment integration exists.';
comment on column public.organizations.stripe_subscription_id is
  'Future Stripe subscription identifier. Nullable until payment integration exists.';
comment on column public.organizations.trial_ends_at is
  'Optional trial end timestamp for future billing workflows.';
comment on column public.organizations.current_period_ends_at is
  'Optional current billing period end timestamp from a future payment provider.';
