import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WebMCP requires an origin-isolated document. Confirmed in probe/FINDINGS.md that
  // these survive a proxy; Chrome docs ask for them and they cost nothing.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Origin-Agent-Cluster", value: "?1" },
          { key: "Permissions-Policy", value: "tools=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
