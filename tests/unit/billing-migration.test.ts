import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/0014_organization_billing_readiness.sql"),
  "utf8"
);

describe("organization billing readiness migration", () => {
  it("adds billing fields to organizations without requiring a payment provider", () => {
    expect(migration).toContain("add column if not exists billing_status");
    expect(migration).toContain("add column if not exists billing_plan");
    expect(migration).toContain("add column if not exists billing_email");
    expect(migration).toContain("add column if not exists stripe_customer_id");
    expect(migration).toContain("add column if not exists stripe_subscription_id");
    expect(migration).toContain("add column if not exists trial_ends_at");
    expect(migration).toContain("add column if not exists current_period_ends_at");
    expect(migration).toContain("Not currently used to gate product access");
  });

  it("backfills safe manual billing defaults and guards external identifiers", () => {
    expect(migration).toContain("billing_status = coalesce(billing_status, 'manual')");
    expect(migration).toContain("billing_plan = coalesce(nullif(trim(billing_plan), ''), 'mvp')");
    expect(migration).toContain("organizations_billing_status_check");
    expect(migration).toContain("'manual', 'trialing', 'active', 'past_due', 'paused', 'canceled', 'unpaid'");
    expect(migration).toContain("idx_organizations_stripe_customer_id");
    expect(migration).toContain("where stripe_customer_id is not null");
    expect(migration).toContain("idx_organizations_stripe_subscription_id");
    expect(migration).toContain("where stripe_subscription_id is not null");
  });
});
