import Link from "next/link";
import type { z } from "zod";
import type { profileSchema } from "@/lib/auth";
import type { Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { accountEditorial } from "@/lib/content/editorial-content";
import { signOut } from "@/app/[locale]/account/actions";
import { Icon } from "./Icons";
import { ProfileForm } from "./ProfileForm";

type Profile = z.infer<typeof profileSchema>;

export function AccountView({
  locale,
  email,
  profile,
  messages: m,
}: {
  locale: Locale;
  email: string;
  profile: Profile;
  messages: Messages;
}) {
  const roleLabel = profile.role === "admin"
    ? m.accountRoleAdmin
    : profile.role === "producer"
      ? m.accountRoleProducer
      : m.accountRoleBuyer;

  return (
    <div className="account-layout">
      <article className="account-card">
        <span className="account-avatar" aria-hidden="true">
          {profile.display_name.slice(0, 1).toLocaleUpperCase(locale)}
        </span>
        <div>
          <p className="eyebrow">{m.welcome}</p>
          <h2>{profile.display_name}</h2>
          <p>{email}</p>
          <span className="account-role">{roleLabel}</span>
        </div>
        <div className="account-actions">
          <Link className="btn btn-secondary" href={`/${locale}/favorites`}>
            <Icon name="heart" />{m.favorites}
          </Link>
          <form action={signOut}>
            <input type="hidden" name="locale" value={locale} />
            <button className="btn btn-secondary" type="submit">{m.signOut}</button>
          </form>
        </div>
      </article>
      <ProfileForm profile={profile} locale={locale} messages={m} />
      <section className="account-info-grid" aria-label={locale === "tr" ? "Hesap bilgileri" : "Account information"}>
        {accountEditorial.sections.map((section, index) => (
          <article key={section.title.tr}>
            <span aria-hidden="true"><Icon name={index === 0 ? "pin" : index === 1 ? "sun" : index === 2 ? "heart" : index === 3 ? "compass" : "shield"} /></span>
            <h3>{section.title[locale]}</h3>
            <p>{section.text[locale]}</p>
          </article>
        ))}
        <nav className="account-info-links">
          <Link className="text-link" href={`/${locale}/info/safety`}>{m.safety}<Icon name="arrow" size={16} /></Link>
          {profile.role === "producer" ? <Link className="text-link" href={`/${locale}/info/producer-application`}>{m.startApplication}<Icon name="arrow" size={16} /></Link> : null}
        </nav>
      </section>
    </div>
  );
}
