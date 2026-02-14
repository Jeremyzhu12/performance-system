#!/bin/sh
set -e

cd /app/server

echo ">>> Running database migrations..."
npx prisma migrate deploy

echo ">>> Seeding database (if needed)..."
npx tsx prisma/seed.ts || true

echo ">>> Starting backend server..."
npx tsx src/index.ts &

echo ">>> Starting nginx..."
nginx -g "daemon off;"
