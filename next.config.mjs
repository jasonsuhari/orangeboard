/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
};

export default nextConfig;
