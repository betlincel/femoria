import Link from "next/link";
import { commerceUi, productWorlds, type Messages } from "@/lib/i18n";
import type { Locale, ProductWorld } from "@/lib/types";
import { Icon } from "./Icons";
import { Logo } from "./Logo";
import type { SellerNavigationState } from "@/lib/supabase/seller";

export function MobileDrawer({
  locale,
  open,
  otherPath,
  pathname,
  messages: m,
  sellerNavigation,
  cartQuantity,
  onClose,
  onLocation,
}: {
  locale: Locale;
  open: boolean;
  otherPath: string;
  pathname: string;
  messages: Messages;
  sellerNavigation: SellerNavigationState;
  cartQuantity: number;
  onClose: () => void;
  onLocation: () => void;
}) {
  const regularNav = [
    { href: `/${locale}/nearby`, label: m.nav.nearby },
    { href: `/${locale}/producers`, label: m.nav.producers },
    { href: `/${locale}/guide`, label: m.nav.guide },
    { href: `/${locale}/how-it-works`, label: m.nav.howItWorks },
  ];

  return (
    <>
      <div
        className={`drawer-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`mobile-drawer ${open ? "open" : ""}`}
        id="mobile-drawer"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="drawer-head">
          <Logo locale={locale} />
          <button type="button" onClick={onClose} aria-label={m.closeMenu}>
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label={m.menuLinksTitle}>
          {(["kitchen", "workshop"] as ProductWorld[]).map((world) => {
            const content = productWorlds[world];
            const worldLabel =
              world === "kitchen" ? m.nav.kitchen : m.nav.workshop;
            return (
              <details
                className={`drawer-accordion ${world} ${pathname.startsWith(`/${locale}/${world}`) ? "active" : ""}`}
                key={world}
              >
                <summary>
                  <span><small>{world === "kitchen" ? "01" : "02"}</small>{worldLabel}</span>
                  <Icon name="chevron" />
                </summary>
                <div>
                  <Link href={`/${locale}/${world}`} onClick={onClose}>
                    {world === "kitchen" ? m.viewKitchen : m.viewWorkshop}
                  </Link>
                  {content.categories.map((category) => (
                    <Link
                      href={`/${locale}/${world}#categories`}
                      key={category.tr}
                      onClick={onClose}
                    >
                      {category[locale]}
                    </Link>
                  ))}
                </div>
              </details>
            );
          })}
          {regularNav.map((item) => (
            <Link
              className={`drawer-link ${pathname.startsWith(item.href) ? "active" : ""}`}
              key={item.href}
              href={item.href}
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
              onClick={onClose}
            >
              {item.label}<Icon name="chevron" size={18} />
            </Link>
          ))}
          {sellerNavigation === "approved" ? <Link className={`drawer-link ${pathname.startsWith(`/${locale}/seller`) ? "active" : ""}`} href={`/${locale}/seller`} onClick={onClose}>{m.sellerPanel}<Icon name="chevron" size={18} /></Link> : null}
          {sellerNavigation === "pending" || sellerNavigation === "rejected" ? <Link className="drawer-link" href={`/${locale}/info/producer-application`} onClick={onClose}>{sellerNavigation === "pending" ? m.accountSellerPending : m.accountSellerRejected}<Icon name="chevron" size={18} /></Link> : null}
          {sellerNavigation === "none" ? <Link className="drawer-link" href={`/${locale}/info/producer-application`} onClick={onClose}>{m.startApplication}<Icon name="chevron" size={18} /></Link> : null}
        </nav>
        <div className="drawer-account-links">
          <Link className={pathname.startsWith(`/${locale}/account/orders`) ? "active" : ""} href={`/${locale}/account/orders`} onClick={onClose}>{commerceUi[locale].ordersTitle}</Link>
          <Link className={pathname.startsWith(`/${locale}/favorites`) ? "active" : ""} href={`/${locale}/favorites`} onClick={onClose}>{m.favorites}</Link>
          <Link className={pathname.startsWith(`/${locale}/cart`) ? "active" : ""} href={`/${locale}/cart`} onClick={onClose}>{m.cart}{cartQuantity ? ` (${cartQuantity})` : ""}</Link>
          <Link className={pathname.startsWith(`/${locale}/account`) ? "active" : ""} href={`/${locale}/account`} onClick={onClose}>{m.nav.account}</Link>
        </div>
        <div className="drawer-actions">
          <button type="button" onClick={onLocation}>
            <Icon name="pin" />{m.locationShort}
          </button>
          <Link href={otherPath} onClick={onClose}>{m.localeName}</Link>
        </div>
      </aside>
    </>
  );
}
