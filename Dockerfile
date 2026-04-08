FROM docker.io/oven/bun:1-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .

RUN bun run build

FROM docker.io/node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
ENV HOST=0.0.0.0
ENV PORT=3000
ENV PB_URL=http://127.0.0.1:8090

RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 1001

COPY --from=build --chown=appuser:appgroup /app/.output ./.output

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.NITRO_PORT || process.env.PORT || '3000') + '/').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
