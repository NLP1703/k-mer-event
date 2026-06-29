# ── K-MER Event frontend (build + static serve via Nginx) ────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# The API base URL must be known at build time (Vite inlines it).
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Runtime: Nginx serving the SPA and proxying /api + /socket.io to the API ──
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
