const PHASE_DEVELOPMENT_SERVER = "phase-development-server";

/** @type {(phase: string) => import('next').NextConfig} */
const nextConfig = (phase) => ({
  reactStrictMode: true,
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  experimental: {
    devtoolSegmentExplorer: false,
  },
  // Pin the workspace root — a stray lockfile in the home dir otherwise
  // makes Next infer the wrong root.
  outputFileTracingRoot: import.meta.dirname,
  webpack: (config) => {
    // Transformers.js runs in the browser for /vision's OWL-ViT detector; stop
    // webpack from trying to bundle its Node-only backends (sharp / onnxruntime-node).
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
});

export default nextConfig;
