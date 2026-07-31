import Link from "next/link";
import { productWorlds, type Messages } from "@/lib/i18n";
import type { Locale, ProductWorld } from "@/lib/types";
import { Icon } from "./Icons";
import { Logo } from "./Logo";

export function MobileDrawer({
  locale,
  open,
  otherPath,
  messages: m,
  onClose,
  onLocation,
}: {
  locale: Locale;
  open: boolean;
  otherPath: string;
  messages: Messages;
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
              <details className={`drawer-accordion ${world}`} key={world}>
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
              className="drawer-link"
              key={item.href}
              href={item.href}
              onClick={onClose}
            >
              {item.label}<Icon name="chevron" size={18} />
            </Link>
          ))}
        </nav>
        <div className="drawer-account-links">
          <Link href={`/${locale}/favorites`} onClick={onClose}>{m.favorites}</Link>
          <Link href={`/${locale}/cart`} onClick={onClose}>{m.cart}</Link>
          <Link href={`/${locale}/account`} onClick={onClose}>{m.nav.account}</Link>
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
