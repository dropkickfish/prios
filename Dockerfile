# Stage 1: Build client
FROM node:22-alpine AS build-client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Build server
FROM node:22-alpine AS build-server
RUN apk add --no-cache python3 make g++
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./
RUN npm run build
# Prune dev deps — drizzle-kit stays as it's needed at runtime for migrations
RUN npm prune --omit=dev

# Stage 3: Runtime
FROM node:22-alpine AS runtime
WORKDIR /app/server

# Copy prod node_modules with compiled native addons
COPY --from=build-server /app/server/node_modules ./node_modules

# Copy compiled server
COPY --from=build-server /app/server/dist ./dist

# Copy schema files and config needed by drizzle-kit push at runtime
COPY server/drizzle.config.ts ./drizzle.config.ts
COPY server/src/schema.ts ./src/schema.ts
COPY server/src/schema.pg.ts ./src/schema.pg.ts

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
