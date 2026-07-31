"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { productWorlds, type Messages } from "@/lib/i18n";
import type { Locale, ProductWorld } from "@/lib/types";
import { Brand } from "./Brand";
import { Icon } from "./Icons";

export function Header({
  locale,
  messages: m,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const pathname = usePathname();
  const otherLocale = locale === "tr" ? "en" : "tr";
  const otherPath = pathname.replace(/^\/(tr|en)/, `/${otherLocale}`);
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    document.body.classList.toggle("drawer-open", menuOpen);
    return () => document.body.classList.remove("drawer-open");
  }, [menuOpen]);

  const regularNav = [
    { href: `/${locale}/nearby`, label: m.nav.nearby },
    { href: `/${locale}/producers`, label: m.nav.producers },
    { href: `/${locale}/guide`, label: m.nav.guide },
  ];

  return (
    <>
      <a className="skip-link" href="#main">{m.skipToContent}</a>
      <div className="topbar">
        <div className="container">
          <p>{m.announcement}</p>
          <p>{m.ethical}</p>
        </div>
      </div>
      <header className="header">
        <nav className="nav container" aria-label={m.menuLinksTitle}>
          <Brand locale={locale} />

          <div className="desktop-nav">
            <MegaMenu
              locale={locale}
              world="kitchen"
              label={m.nav.kitchen}
              menuLabel={m.kitchenMenuTitle}
              cta={m.viewKitchen}
            />
            <MegaMenu
              locale={locale}
              world="workshop"
              label={m.nav.workshop}
              menuLabel={m.workshopMenuTitle}
              cta={m.viewWorkshop}
            />
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
              aria-label={m.location}
              onClick={() => dialogRef.current?.showModal()}
            >
              <Icon name="pin" size={17} />
              <span>{m.location}</span>
            </button>
            <Link className="icon-button search-button" href={`/${locale}/products`} aria-label={m.searchAction}>
              <Icon name="search" />
            </Link>
            <Link className="locale-link" href={otherPath}>{m.localeName}</Link>
            <button className="icon-button desktop-action" type="button" aria-label={m.favorites}>
              <Icon name="heart" />
            </button>
            <button className="icon-button desktop-action" type="button" aria-label={m.cart}>
              <Icon name="bag" />
            </button>
            <button className="login-button desktop-action" type="button">{m.login}</button>
            <button
              className="menu-button"
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-drawer"
              aria-label={menuOpen ? m.closeMenu : m.openMenu}
              onClick={() => setMenuOpen((value) => !value)}
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
          </div>
        </nav>
      </header>

      <div
        className={`drawer-backdrop ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`mobile-drawer ${menuOpen ? "open" : ""}`}
        id="mobile-drawer"
        aria-hidden={!menuOpen}
      >
        <div className="drawer-head">
          <p>{m.menuLinksTitle}</p>
          <button type="button" onClick={() => setMenuOpen(false)} aria-label={m.closeMenu}>
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label={m.menuLinksTitle}>
          <Link className="drawer-world kitchen" href={`/${locale}/kitchen`} onClick={() => setMenuOpen(false)}>
            <span><small>01</small>{m.nav.kitchen}</span><Icon name="arrow" />
          </Link>
          <Link className="drawer-world workshop" href={`/${locale}/workshop`} onClick={() => setMenuOpen(false)}>
            <span><small>02</small>{m.nav.workshop}</span><Icon name="arrow" />
          </Link>
          {[...regularNav, { href: `/${locale}/how-it-works`, label: m.nav.howItWorks }].map((item) => (
            <Link className="drawer-link" key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}<Icon name="chevron" size={18} />
            </Link>
          ))}
        </nav>
        <div className="drawer-actions">
          <button type="button" onClick={() => dialogRef.current?.showModal()}>
            <Icon name="pin" />{m.location}
          </button>
          <Link href={otherPath} onClick={() => setMenuOpen(false)}>{m.localeName}</Link>
        </div>
      </aside>

      <dialog
        className="location-dialog"
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="dialog-inner">
          <div className="dialog-head">
            <h2>{m.locationDialogTitle}</h2>
            <button
              className="dialog-close"
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={m.close}
            >
              <Icon name="close" />
            </button>
          </div>
          <p>{m.locationDialogText}</p>
          <div className="dialog-grid">
            <label>{m.city}<select defaultValue="Ankara"><option>Ankara</option><option>İstanbul</option><option>İzmir</option><option>Bursa</option></select></label>
            <label>{m.district}<select defaultValue="Çankaya"><option>Çankaya</option><option>Keçiören</option><option>Yenimahalle</option></select></label>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => dialogRef.current?.close()}>
            {m.saveLocation}
          </button>
        </div>
      </dialog>
    </>
  );
}

function MegaMenu({
  locale,
  world,
  label,
  menuLabel,
  cta,
}: {
  locale: Locale;
  world: ProductWorld;
  label: string;
  menuLabel: string;
  cta: string;
}) {
  const content = productWorlds[world];
  return (
    <details className="mega-menu">
      <summary>{label}<span aria-hidden="true">⌄</span></summary>
      <div className={`mega-panel mega-${world}`} aria-label={menuLabel}>
        <div className="mega-intro">
          <p>FEMORIA</p>
          <h2>{content.title[locale]}</h2>
          <span>{content.description[locale]}</span>
          <Link href={`/${locale}/${world}`}>{cta}<Icon name="arrow" /></Link>
        </div>
        <ul>
          {content.categories.map((category, index) => (
            <li key={category.tr}>
              <Link href={`/${locale}/${world}#categories`}>
                <span>{String(index + 1).padStart(2, "0")}</span>{category[locale]}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
