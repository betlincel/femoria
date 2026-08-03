"use client";

import Image from "next/image";
import { useState } from "react";

const FALLBACK_IMAGE = "/brand/product-placeholder.svg";
const SUPABASE_PUBLIC_STORAGE_PATH = "/storage/v1/object/public/";

function isSupabasePublicStorageUrl(src: string) {
  try {
    const url = new URL(src);

    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.pathname.includes(SUPABASE_PUBLIC_STORAGE_PATH)
    );
  } catch {
    return false;
  }
}

export function SafeImage({
  src,
  alt,
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const [source, setSource] = useState(src);
  return (
    <Image
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      src={source}
      unoptimized={isSupabasePublicStorageUrl(source)}
      onError={() => setSource(FALLBACK_IMAGE)}
    />
  );
}
