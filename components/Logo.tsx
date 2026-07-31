import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/types";

export function Logo({
  locale,
  light = false,
}: {
  locale: Locale;
  light?: boolean;
}) {
  return (
    <Link className="brand" href={`/${locale}`} aria-label="FEMORIA">
      <Image
        className="brand-logo"
        src={light ? "/brand/femoria-logo-light.svg" : "/brand/femoria-logo.svg"}
        width={154}
        height={36}
        priority
        alt="FEMORIA"
      />
      <Image
        className="brand-mark-image"
        src="/brand/femoria-mark.svg"
        width={38}
        height={38}
        priority
        alt=""
      />
    </Link>
  );
}
