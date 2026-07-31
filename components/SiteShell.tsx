import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function SiteShell({ locale, messages, children }: { locale: Locale; messages: Messages; children: React.ReactNode }) {
  return (
    <>
      <Header locale={locale} messages={messages} />
      <main id="main">{children}</main>
      <Footer locale={locale} messages={messages} />
    </>
  );
}
