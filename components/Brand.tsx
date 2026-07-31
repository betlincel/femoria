import type { Locale } from "@/lib/types";
import { Logo } from "./Logo";

export function Brand({ locale }: { locale: Locale }) {
  return <Logo locale={locale} />;
}
