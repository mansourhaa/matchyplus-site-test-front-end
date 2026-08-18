FROM node:22-slim AS base

FROM base AS builder

RUN apt-get update && apt-get install -y bash openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN pnpm install turbo --global

COPY . .

RUN turbo prune @saas-boilerplate/landing --docker

FROM base AS installer

WORKDIR /app

RUN apt-get update && apt-get install -y openssl bash && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

RUN pnpm install

# Where the "Connexion" and "Inscription" buttons send visitors. Next.js inlines
# NEXT_PUBLIC_* into the client bundle at BUILD time, so this cannot be set on
# the Deployment or in a ConfigMap afterwards - the string is already compiled
# into the JavaScript.
#
# This file used to claim landing read no NEXT_PUBLIC_* vars. That was true while
# landing was a placeholder page; the Vite-to-Next migration replaced it with a
# real marketing site that reads NEXT_PUBLIC_APP_URL, and the stale comment meant
# nobody passed it. Production shipped with the localhost fallback compiled in,
# so every visitor who clicked Connexion was sent to their own machine.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm turbo build --filter=@saas-boilerplate/landing

FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

# This comment used to say landing ships no public/ dir. That stopped being
# true once the marketing site grew real assets - logo-matchy.svg,
# logo-matchy-white.svg, robots.txt, and the hero/testimonial photos under
# public/matchy/ (selfie-man.png, pro-man.png, referenced through Next's image
# optimizer). The copy was never added when they landed, so none of it existed
# in the production image: the header logo was blank, robots.txt 404'd, and
# every photo Next's optimizer tried to read from public/ came back missing.
# Next.js serves public/ at the site root, same as apps/app already does below.
COPY --from=installer /app/apps/landing/public ./apps/landing/public
COPY --from=installer --chown=nextjs:nodejs /app/apps/landing/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/landing/.next/static ./apps/landing/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/landing/server.js"]
