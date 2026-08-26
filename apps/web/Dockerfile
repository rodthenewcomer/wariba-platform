# WARIBA Web — Next.js 15 application.
#
# ARCH-023 (web provider) is still OPEN. A managed Next platform would build
# this app from source and ignore this file entirely; this exists so that
# choice stays open rather than being forced by the absence of a container
# path. Nothing here is vendor-specific.
#
# Three stages, because a Next build needs the whole workspace and the runtime
# needs almost none of it. `output: 'standalone'` (next.config.mjs) is what
# makes that separation possible inside a pnpm workspace.

# ---- deps -------------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json               apps/web/
COPY packages/adapters/package.json      packages/adapters/
COPY packages/application/package.json   packages/application/
COPY packages/config/package.json        packages/config/
COPY packages/contracts/package.json     packages/contracts/
COPY packages/database/package.json      packages/database/
COPY packages/design-tokens/package.json packages/design-tokens/
COPY packages/domain/package.json        packages/domain/
COPY packages/observability/package.json packages/observability/
COPY packages/policies/package.json      packages/policies/
COPY packages/ui/package.json            packages/ui/
COPY packages/validation/package.json    packages/validation/

RUN pnpm install --frozen-lockfile --filter @wariba/web...

# ---- build ------------------------------------------------------------------
FROM deps AS build
WORKDIR /repo

# tsconfig.base.json is extended by every package tsconfig; without it the
# Next build fails with TS5083 at the type-check step.
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/web ./apps/web

# NEXT_PUBLIC_* values are inlined at build time, so they must be present here
# — and they are public by definition. No server secret is passed as a build
# arg: those arrive at run time and would otherwise be readable in the image
# history.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_REALTIME_WS_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_REALTIME_WS_URL=$NEXT_PUBLIC_REALTIME_WS_URL

# Placeholder server config, for the build stage only.
#
# Next prerenders every route it can, and a prerendered page under (platform)
# or (auth) renders a layout that builds a Supabase server client and validates
# the full server config. The build therefore needs values that *parse*, even
# though it never connects to anything with them.
#
# These are deliberately obvious fakes and they are safe: this is a discarded
# build stage. The runtime stage below starts `FROM node:24-alpine` and copies
# only the standalone output, so nothing here reaches the shipped image — which
# is exactly why they are ENV in this stage rather than ARG on the whole build,
# where they would persist in image history.
#
# APP_ENV is `staging` and not `production` on purpose: the config layer
# refuses a sandbox payment provider under production, which is a guard worth
# keeping. The build only needs values that parse.
#
# Real values arrive as runtime environment variables (apps/web/.env.example).
ENV APP_ENV=staging \
    APP_BASE_URL=https://build.invalid \
    SUPABASE_URL=https://build.invalid \
    SUPABASE_ANON_KEY=build-time-placeholder \
    SUPABASE_SERVICE_ROLE_KEY=build-time-placeholder \
    DATABASE_URL=postgresql://build:build@build.invalid:5432/build \
    SANDBOX_WEBHOOK_SECRET=build-time-placeholder \
    PAYMENT_PROVIDER=sandbox \
    PAYOUT_PROVIDER=mock

RUN pnpm --filter @wariba/web build

# ---- runtime ----------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apk add --no-cache tini

# The standalone bundle already contains the traced server and its minimal
# dependency tree; static and public are copied beside it because the standalone
# tracer deliberately does not include them.
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
