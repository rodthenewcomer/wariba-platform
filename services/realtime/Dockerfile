# WARIBA Realtime — market data, leadership, alert monitoring.
#
# Vendor-neutral on purpose. ARCH-024 (container provider) is still OPEN, so
# this must run unchanged on any platform that can build a Dockerfile and send
# SIGTERM. Nothing here names a vendor.
#
# Two stages: `deps` resolves the workspace once, `runtime` carries only what
# the process needs. The service starts through `tsx`, matching its package
# `start` script — this image deliberately does not change how the service is
# executed, only where it can run.

# ---- deps -------------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Manifests first, so a source-only change reuses the install layer. Every
# workspace package the service imports transitively must be listed, or pnpm
# resolves an incomplete graph.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/realtime/package.json      services/realtime/
COPY packages/config/package.json        packages/config/
COPY packages/contracts/package.json     packages/contracts/
COPY packages/database/package.json      packages/database/
COPY packages/domain/package.json        packages/domain/
COPY packages/policies/package.json      packages/policies/
COPY packages/adapters/package.json      packages/adapters/
COPY packages/observability/package.json packages/observability/
COPY packages/validation/package.json    packages/validation/

# --frozen-lockfile is the deterministic-build requirement: the image fails
# rather than silently resolving a different tree than CI verified.
RUN pnpm install --frozen-lockfile --filter @wariba/realtime...

# ---- runtime ----------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /repo

ENV NODE_ENV=production
# Signals reach PID 1 correctly through tini rather than through a shell that
# would swallow them — the graceful shutdown in src/index.ts depends on it.
# tini only. pnpm is deliberately absent from the runtime stage: going through
# `pnpm --filter … start` made corepack fetch pnpm from the network on every
# container start, which turns a cold start into a registry dependency and an
# offline registry into a failed deploy. The process is invoked directly.
RUN apk add --no-cache tini

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/packages ./packages
COPY --from=deps /repo/services/realtime/node_modules ./services/realtime/node_modules

COPY packages ./packages
COPY services/realtime ./services/realtime
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./

# Never root. No secret is copied in: every credential arrives as an
# environment variable at run time (see services/realtime/.env.example).
USER node

EXPOSE 4001

# Liveness only. Readiness is /health's own payload — `safe_to_accept_trading_traffic`
# and `leader` tell a platform whether to route, and a restart on those would
# kill a healthy standby that is correctly waiting for a lease.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.REALTIME_PORT||4001)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
WORKDIR /repo/services/realtime
CMD ["node_modules/.bin/tsx", "src/index.ts"]
