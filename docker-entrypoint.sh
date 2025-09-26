#!/bin/sh
set -e

echo "🚀 Starting application with database migrations..."

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  echo "⚠️  DATABASE_URL not set, skipping migrations"
else
  echo "📊 Running database migrations..."
  
  # Wait a moment for database to be ready
  sleep 2
  
  # Run migrations using our script
  ./scripts/apply-migration.sh apply || {
    echo "❌ Migration failed, but continuing startup..."
    echo "   You may need to run migrations manually"
  }
  
  echo "✅ Migration step completed"
fi

echo "🎯 Starting the application..."
exec "$@"
