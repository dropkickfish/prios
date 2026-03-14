#!/bin/sh
set -e

echo "Running database migrations..."
npx drizzle-kit push

echo "Starting server..."
exec node dist/index.js
