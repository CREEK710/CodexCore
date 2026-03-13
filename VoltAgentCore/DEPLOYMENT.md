# Vercel Deployment

Deploy the `VoltAgentCore` directory as the Vercel project root.

## Runtime Layout

- Local development uses the Node server entrypoint in `src/index.ts`
- Vercel uses the serverless handlers in `api/VoltAgent.ts` and `api/VoltAgent/[...path].ts`
- Requests under `/api/VoltAgent` are normalized before reaching the VoltAgent Hono app
- Sentry Node instrumentation is initialized in `src/sentry.ts`

## Preview / Production Behavior

- `VERCEL_ENV=preview|production` is used automatically
- CORS origins are built from `APP_URL`, `CORS_ALLOW_ORIGINS`, `VERCEL_URL`, `VERCEL_BRANCH_URL`, and `VERCEL_PROJECT_PRODUCTION_URL`
- Storage defaults:
  - local: `libsql`
  - Vercel: `memory`
  - override with `VOLTAGENT_STORAGE_MODE=libsql|memory`

## Persistence

- For persistent data on Vercel, set `LIBSQL_URL` and `LIBSQL_AUTH_TOKEN`
- Without remote LibSQL, preview/production use in-memory storage and lose state between cold starts

## Sentry

- Runtime tracing/errors are enabled when `SENTRY_DSN` is set
- `SENTRY_ENVIRONMENT` defaults to the deployment stage if omitted
- `SENTRY_RELEASE` defaults to `VERCEL_GIT_COMMIT_SHA` or `VERCEL_DEPLOYMENT_ID`
- `SENTRY_TRACES_SAMPLE_RATE` defaults to:
  - `1` in development
  - `0.25` in preview
  - `0.1` in production
- Build output now includes source maps via `tsdown --sourcemap`
- `npm run vercel-build` uploads source maps when:
  - `SENTRY_UPLOAD_SOURCE_MAPS=1`
  - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are set

Recommended Vercel env:

- `NODE_OPTIONS=--enable-source-maps`
