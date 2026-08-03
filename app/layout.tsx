import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FEMORIA — Emeğin en güzel hâli",
    template: "%s · FEMORIA",
  },
  description:
    "Kadın üreticilerin el emeği ürünlerini keşfedin; yakınınızdaki güvenilir üreticilerden alışveriş yapın.",
  applicationName: "FEMORIA",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "FEMORIA — Emeğin en güzel hâli",
    description:
      "Yerel kadın üreticilerden, özenle hazırlanmış ürünleri keşfedin.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F8F4EE",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-femoria-locale") === "en" ? "en" : "tr";
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
