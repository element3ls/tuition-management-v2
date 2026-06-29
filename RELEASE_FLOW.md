# Staging and Release Flow

This project should stay trunk-based for now: `main` is the production-ready branch, and staging is handled through environment configuration, not a long-lived `staging` branch. Add release branches only when multiple customers need different versions at the same time.

## Environments

Use separate Supabase projects for staging and production. Each environment needs its own:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `OPENAI_API_KEY`
- `OPENAI_EXAM_MODEL`
- `OPENAI_WEBHOOK_SECRET`
- `PLAYWRIGHT_BASE_URL`

Keep local target files out of git:

- `.env.staging.local`
- `.env.production.local`
- `.supabase/uat-users.staging.local.json`
- `.supabase/uat-users.production.local.json`

## Branching

Current recommendation:

- Use feature branches for changes.
- Merge only verified work into `main`.
- Let Vercel preview deployments cover feature-branch review.
- Use a staging Vercel project or staging deployment environment connected to the same repo with staging environment variables.
- Use tags for notable production releases, for example `release-2026-06-29`.

Avoid permanent `live` and `staging` branches for now. They add merge and drift overhead before the SaaS has enough tenant-specific release pressure to justify them.

## Staging Release

1. Copy `.env.example` to `.env.staging.local` and fill it with staging values.
2. Run the local release gate:

   ```bash
   npm run release:check:staging
   ```

3. Apply migrations and seed data to staging:

   ```bash
   npm run db:live -- --env-file=.env.staging.local
   ```

4. Verify staging Supabase:

   ```bash
   npm run db:verify-live -- --env-file=.env.staging.local
   ```

5. Create tenant-aware UAT users for staging:

   ```bash
   npm run db:create-uat-users -- --env-file=.env.staging.local --credentials-file=.supabase/uat-users.staging.local.json
   npm run db:verify-uat-users -- --env-file=.env.staging.local --credentials-file=.supabase/uat-users.staging.local.json
   ```

6. Deploy the same commit to the staging Vercel target.
7. Run deployed UAT against the staging URL:

   ```bash
   npm run test:e2e:live -- --base-url=https://your-staging-url.example.com --credentials-file=.supabase/uat-users.staging.local.json
   ```

8. Capture any UAT fixes as normal code changes and repeat the release gate.

## Production Release

Production uses the same sequence after staging passes:

```bash
npm run release:check:production
npm run db:live -- --env-file=.env.production.local
npm run db:verify-live -- --env-file=.env.production.local
npm run db:create-uat-users -- --env-file=.env.production.local --credentials-file=.supabase/uat-users.production.local.json
npm run db:verify-uat-users -- --env-file=.env.production.local --credentials-file=.supabase/uat-users.production.local.json
npm run test:e2e:live -- --base-url=https://your-production-url.example.com --credentials-file=.supabase/uat-users.production.local.json
```

Tag the commit after the production deployment is verified:

```bash
git tag release-YYYY-MM-DD
git push origin release-YYYY-MM-DD
```

## Database Release Rules

- Treat migrations as forward-only.
- Prefer additive migrations before application code starts depending on them.
- Avoid destructive schema changes until tenant backups and rollback plans exist.
- Verify migrations against staging before production.
- Confirm Supabase backups before production migrations that touch tenant data.

## Rollback

App rollback is redeploying the previous verified commit.

Database rollback is not automatic. If a migration changes data, create a forward repair migration instead of editing an already-applied migration. For production, take a Supabase backup before risky migrations.

## Tenant-Safety Checks

Before promoting a release, confirm:

- `npm run release:check:staging` passes.
- `npm run db:verify-live -- --env-file=.env.staging.local` passes.
- Deployed UAT passes for both admin and student paths.
- Cross-tenant tests are passing in the full test suite.
- Storage keys remain tenant-prefixed.
- OpenAI usage events include `organization_id`.
