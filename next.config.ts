import type { NextConfig } from "next";

function getSupabaseImagePattern() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    const protocol = url.protocol === "http:" ? "http" : "https";
    return {
      protocol,
      hostname: url.hostname,
      pathname: "/storage/v1/object/**",
    } as const;
  } catch {
    return null;
  }
}

const supabaseImagePattern = getSupabaseImagePattern();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-**",
      },
      ...(supabaseImagePattern ? [supabaseImagePattern] : []),
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
