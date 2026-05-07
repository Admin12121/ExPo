import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "www.jcpw.dev",
        pathname: "/codepen/img/privacy-shield.svg",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
