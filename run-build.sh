#!/bin/bash
# Build script for production deployment
echo "Building Next.js application for production..."
npx next build
echo "Build complete! You can now deploy the .next directory to Vercel"