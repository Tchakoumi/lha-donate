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

# Database seeding has been disabled - users will be created via signup
echo "ℹ️ Database seeding disabled - users created via signup"

echo "🎉 Application setup complete, starting Next.js..."

# Start the application
exec "$@"