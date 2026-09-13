# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

# --- Dependencias ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Runtime ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
# Necesario si la red de la organización tiene un proxy/firewall con
# inspección TLS que interfiere con TLS 1.3 (visto en desarrollo: Node
# recibía ECONNRESET al llamar a login.microsoftonline.com). Si el hosting
# final no está detrás de esa red, esta línea se puede quitar sin problema.
ENV NODE_OPTIONS=--tls-max-v1.2

CMD ["node", "server.js"]
