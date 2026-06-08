#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Only push DB schema if a database is provisioned
if [ -n "$DATABASE_URL" ]; then
  pnpm --filter db push
fi
pnpm --filter @workspace/taste-app run build
pnpm --filter @workspace/api-server run build
