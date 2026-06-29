# ── K-MER Event API ──────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies only (build cache friendly).
COPY package*.json ./
RUN npm ci --omit=dev

# App source.
COPY . .

# Uploaded files live here; mount a volume in compose to persist them.
RUN mkdir -p uploads

EXPOSE 4000

# Basic container healthcheck against the health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

CMD ["node", "server.js"]
