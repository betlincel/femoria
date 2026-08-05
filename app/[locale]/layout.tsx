import type { Metadata } from "next";
import { getLocale, translations } from "@/lib/i18n";
import { SiteShell } from "@/components/SiteShell";
import { getSellerNavigationState } from "@/lib/supabase/seller";
import { getCartQuantity } from "@/lib/supabase/commerce";

export function generateStaticParams() {
  return [{ locale: "tr" }, { locale: "en" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const locale = getLocale((await params).locale);
  const messages = translations[locale];

  return {
    title: messages.metaTitle,
    description: messages.metaDescription,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = getLocale((await params).locale);
  const [sellerNavigation, cartQuantity] = await Promise.all([
    getSellerNavigationState(),
    getCartQuantity(),
  ]);
  return (
    <SiteShell locale={locale} messages={translations[locale]} sellerNavigation={sellerNavigation} cartQuantity={cartQuantity}>
      {children}
    </SiteShell>
  );
}
