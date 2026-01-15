#!/bin/bash
set -e

echo "Installing dependencies..."
pnpm install --frozen-lockfile --ignore-scripts

echo "Removing sharp package..."
rm -rf node_modules/.pnpm/sharp@* 2>/dev/null || true
rm -rf node_modules/sharp 2>/dev/null || true

echo "Building Next.js..."
pnpm run build

echo "Build complete!"
