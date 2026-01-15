#!/bin/bash
set -e

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Building Next.js..."
pnpm run build

echo "Build complete!"
