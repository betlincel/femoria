"use client";

import { useFavorites } from "./FavoritesProvider";
import { Icon } from "./Icons";

export function FavoriteButton({
  productId,
  addLabel,
  removeLabel,
  className = "favorite",
  withText = false,
}: {
  productId: string;
  addLabel: string;
  removeLabel: string;
  className?: string;
  withText?: boolean;
}) {
  const { isFavorite, toggle } = useFavorites();
  const active = isFavorite(productId);
  const label = active ? removeLabel : addLabel;

  return (
    <button
      className={`${className} ${active ? "active" : ""}`}
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle(productId);
      }}
    >
      <Icon name="heart" size={18} />
      {withText ? <span>{label}</span> : null}
    </button>
  );
}
