# WARIBA Worker — daily finalisation and scheduled risk jobs.
#
# Same vendor-neutral contract as the realtime image (ARCH-024 OPEN). The
# worker's dependency graph is much smaller than realtime's — it needs no
# market-data adapters — so its manifest list is correspondingly shorter.

# ---- deps -------------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/worker/package.json        services/worker/
COPY packages/config/package.json        packages/config/
COPY packages/database/package.json      packages/database/
COPY packages/domain/package.json        packages/domain/
COPY packages/policies/package.json      packages/policies/
COPY packages/observability/package.json packages/observability/

RUN pnpm install --frozen-lockfile --filter @wariba/worker...

# ---- runtime ----------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /repo

ENV NODE_ENV=production
# tini only. pnpm is deliberately absent from the runtime stage: going through
# `pnpm --filter … start` made corepack fetch pnpm from the network on every
# container start, which turns a cold start into a registry dependency and an
# offline registry into a failed deploy. The process is invoked directly.
RUN apk add --no-cache tini

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages ./packages
COPY --from=deps /repo/services/worker/node_modules ./services/worker/node_modules

COPY packages ./packages
COPY services/worker ./services/worker
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./

USER node

EXPOSE 4002

# `/health` is liveness and never touches the database, so a database blip does
# not restart a worker that would have recovered on its own. `/ready` is the
# routing probe and does check the database — the platform should gate work on
# that one, not on this.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.WORKER_HEALTH_PORT||4002)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
WORKDIR /repo/services/worker
CMD ["node_modules/.bin/tsx", "src/index.ts"]
