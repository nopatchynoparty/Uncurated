#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push
pnpm --filter @workspace/taste-app run build
pnpm --filter @workspace/api-server run build
