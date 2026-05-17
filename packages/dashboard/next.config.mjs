/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_OUTPUT_EXPORT === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  // Static-export mode for GitHub Pages deploys. The `app/api/` directory is
  // removed by the deploy workflow before this config is read.
  ...(isExport
    ? {
        output: "export",
        basePath,
        assetPrefix: basePath,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
