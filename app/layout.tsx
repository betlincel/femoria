import type { Metadata, Viewport } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.lang=location.pathname.startsWith('/en')?'en':'tr'",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
