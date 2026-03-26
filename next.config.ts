import type { NextConfig } from "next";

/**
 * Root domain (e.g. neet.example.com): leave unset — no basePath.
 * Subpath only: set NEXT_BASE_PATH=/neet in the host’s env (e.g. govindchauhan.com/neet).
 */
const raw = process.env.NEXT_BASE_PATH;
const basePath =
  raw === "" || raw === undefined ? undefined : raw.startsWith("/") ? raw : `/${raw}`;

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
