"use client";

import { Icon } from "./Icons";

const THEME_STORAGE_KEY = "femoria-theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle({ label }: { label: string }) {
  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        const currentTheme = document.documentElement.dataset.theme;
        const nextTheme: Theme = currentTheme === "dark" ? "light" : "dark";
        applyTheme(nextTheme);
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      }}
    >
      <span className="theme-toggle-icon theme-toggle-moon" aria-hidden="true">
        <Icon name="moon" size={18} />
      </span>
      <span className="theme-toggle-icon theme-toggle-sun" aria-hidden="true">
        <Icon name="sun" size={18} />
      </span>
    </button>
  );
}
