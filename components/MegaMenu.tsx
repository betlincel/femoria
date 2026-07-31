import Link from "next/link";
import { productWorlds, type Messages } from "@/lib/i18n";
import type { Locale, ProductWorld } from "@/lib/types";
import { Icon } from "./Icons";

export function MegaMenu({
  locale,
  world,
  open,
  messages: m,
  onToggle,
  onNavigate,
}: {
  locale: Locale;
  world: ProductWorld;
  open: boolean;
  messages: Messages;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const content = productWorlds[world];
  const label = world === "kitchen" ? m.nav.kitchen : m.nav.workshop;
  const menuLabel =
    world === "kitchen" ? m.kitchenMenuTitle : m.workshopMenuTitle;
  const cta = world === "kitchen" ? m.viewKitchen : m.viewWorkshop;
  const panelId = `${world}-mega-panel`;

  return (
    <div className={`mega-menu ${open ? "open" : ""}`}>
      <button
        className="mega-trigger"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        {label}<Icon name="chevron" size={16} />
      </button>
      {open ? (
        <div
          className={`mega-panel mega-${world}`}
          id={panelId}
          aria-label={menuLabel}
        >
          <div className="mega-intro">
            <p>FEMORIA</p>
            <h2>{content.title[locale]}</h2>
            <span>{content.description[locale]}</span>
            <Link href={`/${locale}/${world}`} onClick={onNavigate}>
              {cta}<Icon name="arrow" />
            </Link>
          </div>
          <ul>
            {content.categories.map((category, index) => (
              <li key={category.tr}>
                <Link
                  href={`/${locale}/${world}#categories`}
                  onClick={onNavigate}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {category[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
