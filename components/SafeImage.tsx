"use client";

import Image from "next/image";
import { useState } from "react";

const FALLBACK_IMAGE = "/brand/product-placeholder.svg";

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
      onError={() => setSource(FALLBACK_IMAGE)}
    />
  );
}
