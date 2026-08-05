import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { FavoritesProvider } from "./FavoritesProvider";
import { LocationProvider } from "./LocationProvider";
import { OfflineBanner } from "./OfflineBanner";
import { AssistantWidget } from "./AssistantWidget";
import type { SellerNavigationState } from "@/lib/supabase/seller";

export function SiteShell({ locale, messages, sellerNavigation, cartQuantity, children }: { locale: Locale; messages: Messages; sellerNavigation: SellerNavigationState; cartQuantity: number; children: React.ReactNode }) {
  return (
    <FavoritesProvider>
      <LocationProvider>
        <OfflineBanner
          offlineText={messages.offline}
          restoredText={messages.connectionRestored}
        />
        <Header locale={locale} messages={messages} sellerNavigation={sellerNavigation} cartQuantity={cartQuantity} />
        <main id="main">{children}</main>
        <Footer locale={locale} messages={messages} />
        <BottomNav locale={locale} messages={messages} cartQuantity={cartQuantity} />
        <AssistantWidget locale={locale} />
      </LocationProvider>
    </FavoritesProvider>
  );
}
