# Node 22 LTS — matches typical local dev; adjust if you pin another major.
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 expressjs
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
USER expressjs
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/').then(()=>process.exit(0)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
