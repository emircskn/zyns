import { execSync } from "node:child_process";
import type { NextConfig } from "next";

/**
 * Which build this is, so an open tab can tell a newer one has gone live.
 * The commit, the same for every part of one build (a clock reading would
 * differ between the server's and the browser's halves and read as stale).
 */
function buildId(): string {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BUILD_ID: buildId() },
};

export default nextConfig;
