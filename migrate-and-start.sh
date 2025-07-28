#!/bin/sh
set -e

echo "🚀 Starting LHA Donate production application..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
timeout 60 sh -c 'until nc -z postgres 5432; do echo "Waiting for postgres..."; sleep 2; done'
echo "✅ Database is ready"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client (in case it's needed)
echo "⚙️  Generating Prisma client..."
npx prisma generate

# Seed database if needed (only on first deployment)
if [ "${SEED_DATABASE}" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed || echo "⚠️  Seeding failed or already completed"
fi

echo "🎉 Application setup complete, starting Next.js..."

# Start the application
exec "$@"