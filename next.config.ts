import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Browse moved to the root; keep old links working.
    return [{ source: "/browse", destination: "/", permanent: true }];
  },
};

export default nextConfig;
