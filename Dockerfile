# Stage 1: Build client
FROM node:22-alpine AS build-client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build server
FROM node:22-alpine AS build-server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Runtime
FROM node:22-alpine AS runtime
WORKDIR /app/server

# Install production dependencies only
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy compiled server
COPY --from=build-server /app/server/dist ./dist

# Copy drizzle migration files
COPY server/drizzle ./drizzle
COPY server/drizzle.config.ts ./drizzle.config.ts

# Copy built client
COPY --from=build-client /app/client/dist /app/client/dist

# Entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENV NODE_ENV=production
ENV PUBLIC_DIR=/app/client/dist
ENV DATABASE_URL=/data/sqlite.db
ENV STORAGE_LOCAL_PATH=/data/uploads

VOLUME ["/data"]

ENTRYPOINT ["docker-entrypoint.sh"]
