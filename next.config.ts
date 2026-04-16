import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images:{
    remotePatterns:[
      {
        protocol:'https',
        hostname:'res.cloudinary.com',
      }
    ]
  },

  allowedDevOrigins: ["app.localhost:3000", "*.localhost:3000"],
  experimental: {
    serverActions: {
      allowedOrigins: ["app.localhost:3000", "*.localhost:3000"],
    },
  },
};

export default nextConfig;
