#!/bin/sh
set -e

echo "[entrypoint] running db:migrate..."
pnpm run db:migrate

echo "[entrypoint] starting Next standalone..."
exec node server.js
