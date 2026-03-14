#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/drizzle-kit push

echo "Starting server..."
exec node dist/index.js
