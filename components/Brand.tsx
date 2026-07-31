import Link from "next/link";
import type { Locale } from "@/lib/types";

export function Brand({ locale }: { locale: Locale }) {
  return (
    <Link className="brand" href={`/${locale}`} aria-label="FEMORIA">
      <span className="brand-mark" aria-hidden="true">F</span>
      FEMORIA
    </Link>
  );
}
