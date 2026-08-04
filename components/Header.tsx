"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Messages } from "@/lib/i18n";
import {
  preserveLocalePath,
  reduceMegaMenu,
  type MegaMenuState,
} from "@/lib/navigation";
import type { Locale, ProductWorld } from "@/lib/types";
import type { SellerNavigationState } from "@/lib/supabase/seller";
import { useFavorites } from "./FavoritesProvider";
import { Icon } from "./Icons";
import { LocationPicker } from "./LocationPicker";
import { useLocationSelection } from "./LocationProvider";
import { Logo } from "./Logo";
import { MegaMenu } from "./MegaMenu";
import { MobileDrawer } from "./MobileDrawer";
import { ThemeToggle } from "./ThemeToggle";

export function Header({
  locale,
  messages: m,
  sellerNavigation,
}: {
  locale: Locale;
  messages: Messages;
  sellerNavigation: SellerNavigationState;
}) {
  const pathname = usePathname();
  const otherLocale = locale === "tr" ? "en" : "tr";
  const otherPath = preserveLocalePath(pathname, otherLocale);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState<MegaMenuState>(null);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { ids } = useFavorites();
  const { location } = useLocationSelection();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    queueMicrotask(() => {
      setMegaOpen(null);
      setDrawerOpen(false);
    });
  }, [pathname]);

  useEffect(() => {
    const closeOnOutside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMegaOpen(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMegaOpen(null);
      setDrawerOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("drawer-open", drawerOpen);
    return () => document.body.classList.remove("drawer-open");
  }, [drawerOpen]);

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 18);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  const regularNav = [
    { href: `/${locale}/nearby`, label: m.nav.nearby },
    { href: `/${locale}/producers`, label: m.nav.producers },
    { href: `/${locale}/guide`, label: m.nav.guide },
    ...(sellerNavigation === "approved" ? [{ href: `/${locale}/seller`, label: m.sellerPanel }] : []),
  ];

  const toggleMega = (world: ProductWorld) => {
    setMegaOpen((current) => reduceMegaMenu(current, { type: "toggle", menu: world }));
  };

  return (
    <>
      <a className="skip-link" href="#main">{m.skipToContent}</a>
      <div className="topbar">
        <div className="container">
          <p>{m.announcement}</p>
          <p>{m.ethical}</p>
        </div>
      </div>
      <header className={`header ${scrolled ? "scrolled" : ""}`} ref={headerRef}>
        <nav className="nav container" aria-label={m.menuLinksTitle}>
          <Logo locale={locale} />
          <div className="desktop-nav">
            {(["kitchen", "workshop"] as ProductWorld[]).map((world) => (
              <MegaMenu
                key={world}
                locale={locale}
                world={world}
                open={megaOpen === world}
                active={pathname.startsWith(`/${locale}/${world}`)}
                messages={m}
                onToggle={() => toggleMega(world)}
                onNavigate={() => setMegaOpen(null)}
              />
            ))}
            {regularNav.map((item) => (
              <Link
                className={pathname.startsWith(item.href) ? "active" : ""}
                key={item.href}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="nav-actions">
            <button
              className="location-button"
              type="button"
              aria-label={m.locationShort}
              onClick={() => {
                setMegaOpen(null);
                setLocationOpen(true);
              }}
            >
              <Icon name="pin" size={17} />
              <span>{location?.label ?? m.location}</span>
            </button>
            <Link className="icon-button search-button" href={`/${locale}/products`} aria-label={m.searchAction}>
              <Icon name="search" />
            </Link>
            <Link className="locale-link" href={otherPath}>{m.localeName}</Link>
            <ThemeToggle label={m.toggleTheme} />
            <Link className="icon-button desktop-action nav-count-link" href={`/${locale}/favorites`} aria-label={m.favorites}>
              <Icon name="heart" />
              {ids.length ? <span className="nav-count">{ids.length}</span> : null}
            </Link>
            <Link className="icon-button desktop-action" href={`/${locale}/cart`} aria-label={m.cart}>
              <Icon name="bag" />
            </Link>
            <Link className="login-button desktop-action" href={`/${locale}/login`}>{m.login}</Link>
            <button
              className="menu-button"
              type="button"
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
              aria-label={drawerOpen ? m.closeMenu : m.openMenu}
              onClick={() => {
                setMegaOpen(null);
                setDrawerOpen((value) => !value);
              }}
            >
              <Icon name={drawerOpen ? "close" : "menu"} />
            </button>
          </div>
        </nav>
      </header>
      <MobileDrawer
        locale={locale}
        open={drawerOpen}
        otherPath={otherPath}
        pathname={pathname}
        messages={m}
        sellerNavigation={sellerNavigation}
        onClose={() => setDrawerOpen(false)}
        onLocation={() => {
          setDrawerOpen(false);
          setLocationOpen(true);
        }}
      />
      <LocationPicker
        locale={locale}
        messages={m}
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
      />
    </>
  );
}
