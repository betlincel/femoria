"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createDemoAuthService,
  type DemoUser,
} from "@/lib/demo-auth";
import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { Icon } from "./Icons";

export function AccountView({
  locale,
  messages: m,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const [user, setUser] = useState<DemoUser | null | undefined>(undefined);

  useEffect(() => {
    queueMicrotask(() => {
      setUser(createDemoAuthService(window.localStorage).getUser());
    });
  }, []);

  if (user === undefined) return <div className="skeleton account-skeleton" aria-hidden="true" />;
  if (!user) {
    return (
      <EmptyState
        title={m.accountSignedOutTitle}
        text={m.accountSignedOutText}
        action={{ href: `/${locale}/login`, label: m.login }}
      />
    );
  }

  return (
    <article className="account-card">
      <span className="account-avatar" aria-hidden="true">
        {user.name.slice(0, 1).toLocaleUpperCase(locale)}
      </span>
      <div>
        <p className="eyebrow">{m.welcome}</p>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <span className="account-role">
          {user.role === "producer" ? m.accountRoleProducer : m.accountRoleBuyer}
        </span>
      </div>
      <div className="account-actions">
        <Link className="btn btn-secondary" href={`/${locale}/favorites`}>
          <Icon name="heart" />{m.favorites}
        </Link>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            createDemoAuthService(window.localStorage).signOut();
            setUser(null);
          }}
        >
          {m.signOut}
        </button>
      </div>
    </article>
  );
}
