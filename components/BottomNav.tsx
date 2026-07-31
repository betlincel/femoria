"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";

export function BottomNav({
  locale,
  messages: m,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const pathname = usePathname();
  const items = [
    { href: `/${locale}`, label: m.nav.home, icon: "home" as const },
    { href: `/${locale}/products`, label: m.nav.discover, icon: "compass" as const },
    { href: `/${locale}/nearby`, label: m.nav.nearby, icon: "pin" as const },
    { href: `/${locale}/cart`, label: m.nav.cart, icon: "bag" as const },
    { href: `/${locale}/account`, label: m.nav.account, icon: "user" as const },
  ];

  return (
    <nav className="bottom-nav" aria-label={m.mobileNavigation}>
      {items.map((item) => {
        const active =
          item.href === `/${locale}`
            ? pathname === item.href
            : pathname.startsWith(item.href);
        return (
          <Link className={active ? "active" : ""} href={item.href} key={`${item.label}-${item.icon}`}>
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
