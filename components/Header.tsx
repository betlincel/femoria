"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Brand } from "./Brand";
import { Icon } from "./Icons";

export function Header({ locale, messages }: { locale: Locale; messages: Messages }) {
  const pathname = usePathname();
  const otherLocale = locale === "tr" ? "en" : "tr";
  const otherPath = pathname.replace(/^\/(tr|en)/, `/${otherLocale}`);
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const navItems = [
    { href: `/${locale}/products`, label: messages.nav.discover },
    { href: `/${locale}/nearby`, label: messages.nav.nearby },
    { href: `/${locale}/guide`, label: messages.nav.guide },
    { href: `/${locale}#producers`, label: messages.nav.producers },
  ];

  return (
    <>
      <a className="skip-link" href="#main">{messages.skipToContent}</a>
      <div className="topbar">
        <div className="container">
          <p>{messages.announcement}</p>
          <p>{messages.ethical}</p>
        </div>
      </div>
      <header className="header">
        <nav className="nav container" aria-label={messages.menuLinksTitle}>
          <Brand locale={locale} />
          <div className="nav-links">
            {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
          </div>
          <button className="location-button" type="button" aria-label={messages.location} onClick={() => dialogRef.current?.showModal()}>
            <Icon name="pin" size={18} /><span>{messages.location}</span>
          </button>
          <div className="nav-actions">
            <Link className="locale-link" href={otherPath}>{messages.localeName}</Link>
            <button className="icon-button" type="button" aria-label={messages.favorites}><Icon name="heart" /></button>
            <button className="icon-button" type="button" aria-label={messages.cart}><Icon name="bag" /></button>
            <button className="menu-button" type="button" aria-expanded={menuOpen} aria-label={messages.openMenu} onClick={() => setMenuOpen((value) => !value)}>
              <Icon name="menu" />
            </button>
          </div>
        </nav>
        {menuOpen && (
          <nav className="container mobile-nav" aria-label={messages.menuLinksTitle}>
            {navItems.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
            <Link href={otherPath} onClick={() => setMenuOpen(false)}>{messages.localeName}</Link>
          </nav>
        )}
      </header>
      <dialog className="location-dialog" ref={dialogRef} onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current?.close(); }}>
        <div className="dialog-inner">
          <div className="dialog-head">
            <h2>{messages.locationDialogTitle}</h2>
            <button className="dialog-close" type="button" onClick={() => dialogRef.current?.close()} aria-label={messages.close}>×</button>
          </div>
          <p>{messages.locationDialogText}</p>
          <div className="dialog-grid">
            <label>{messages.city}<select defaultValue="Ankara"><option>Ankara</option><option>İstanbul</option><option>İzmir</option><option>Bursa</option></select></label>
            <label>{messages.district}<select defaultValue="Çankaya"><option>Çankaya</option><option>Keçiören</option><option>Yenimahalle</option></select></label>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => dialogRef.current?.close()}>{messages.saveLocation}</button>
        </div>
      </dialog>
    </>
  );
}
