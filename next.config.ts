import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly opt into Turbopack (Next.js 16 default).
  // ExcelJS runs only in client-side event handlers, so no Node.js
  // polyfills are needed — Turbopack resolves browser-safe code paths
  // automatically for 'use client' modules.
  turbopack: {},
};

export default nextConfig;
