#!/bin/bash
set -e

echo "🔄 Installing dependencies..."
npm install

echo "🔄 Generating Prisma client..."
npx prisma generate

echo "🔄 Checking database connection..."
npx prisma db push --accept-data-loss

echo "ℹ️ Database seeding has been disabled - users will be created via signup"

echo "🚀 Starting development server..."
npm run dev