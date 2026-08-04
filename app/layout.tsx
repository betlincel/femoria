import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-femoria-body",
  display: "swap",
});

const displayFont = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-femoria-display",
  display: "swap",
});

const themeInitializer = `(function(){try{var saved=localStorage.getItem("femoria-theme");var theme=saved==="light"||saved==="dark"?saved:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}catch(error){}})();`;

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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF7F0" },
    { media: "(prefers-color-scheme: dark)", color: "#171018" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-femoria-locale") === "en" ? "en" : "tr";
  return (
    <html
      className={`${bodyFont.variable} ${displayFont.variable}`}
      lang={locale}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
