import type { Locale, ProductWorld } from "./types";

export type MegaMenuState = ProductWorld | null;
export type MegaMenuAction =
  | { type: "toggle"; menu: ProductWorld }
  | { type: "close" };

export function reduceMegaMenu(
  current: MegaMenuState,
  action: MegaMenuAction,
): MegaMenuState {
  if (action.type === "close") return null;
  return current === action.menu ? null : action.menu;
}

export function preserveLocalePath(pathname: string, locale: Locale): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return /^\/(tr|en)(\/|$)/.test(normalized)
    ? normalized.replace(/^\/(tr|en)(?=\/|$)/, `/${locale}`)
    : `/${locale}${normalized === "/" ? "" : normalized}`;
}
