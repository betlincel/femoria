import Link from "next/link";
import type { z } from "zod";
import type { profileSchema } from "@/lib/auth";
import { adminOrdersUi, commerceUi, sellerOrdersUi, type Messages } from "@/lib/i18n";
import type { Locale } from "@/lib/types";
import { isActiveAdminProfile, isAdminProfile, isApprovedSeller } from "@/lib/account-access";
import { accountEditorial } from "@/lib/content/editorial-content";
import type { ProducerApplicationStatus } from "@/lib/producer-application";
import { signOut } from "@/app/[locale]/account/actions";
import { Icon } from "./Icons";
import { ProfileForm } from "./ProfileForm";

type Profile = z.infer<typeof profileSchema>;

export function AccountView({
  locale,
  email,
  profile,
  sellerStatus,
  messages: m,
}: {
  locale: Locale;
  email: string;
  profile: Profile;
  sellerStatus: ProducerApplicationStatus | null;
  messages: Messages;
}) {
  const admin = isAdminProfile(profile);
  const commerce = commerceUi[locale];
  const activeAdmin = isActiveAdminProfile(profile);
  const approvedSeller = isApprovedSeller(
    profile,
    sellerStatus ? { verification_status: sellerStatus } : null,
  );
  const sellerLabel = approvedSeller
    ? m.accountSellerApproved
    : sellerStatus === "pending"
      ? m.accountSellerPending
      : sellerStatus === "rejected"
        ? m.accountSellerRejected
        : null;

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
          <div className="account-badges">
            <span className="account-role">{admin ? m.accountRoleAdmin : m.accountRoleMember}</span>
            {sellerLabel ? <span className={`account-role seller-${sellerStatus}`}>{sellerLabel}</span> : null}
          </div>
        </div>
        <div className="account-actions">
          <Link className="btn btn-primary" href={`/${locale}/account/orders`}>
            <Icon name="bag" />{commerce.ordersTitle}
          </Link>
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
      {activeAdmin ? (
        <section className="account-admin-tools" aria-labelledby="account-admin-tools-title">
          <div>
            <p className="eyebrow">{m.adminManagement}</p>
            <h2 id="account-admin-tools-title">{m.adminManagement}</h2>
          </div>
          <div className="account-admin-links">
            <Link className="btn btn-secondary" href={`/${locale}/admin/producer-applications`}>
              {m.adminProducerApplications}<Icon name="arrow" size={18} />
            </Link>
            <Link className="btn btn-primary" href={`/${locale}/admin/products`}>
              {m.adminProductReviews}<Icon name="arrow" size={18} />
            </Link>
            <Link className="btn btn-secondary" href={`/${locale}/admin/orders`}>
              {adminOrdersUi[locale].orders}<Icon name="arrow" size={18} />
            </Link>
          </div>
        </section>
      ) : null}
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
          {!admin && !approvedSeller ? <Link className="text-link" href={`/${locale}/info/producer-application`}>{m.startApplication}<Icon name="arrow" size={16} /></Link> : null}
        </nav>
      </section>
      {approvedSeller ? (
        <section className="account-seller-tools" aria-label={m.sellerTools}>
          <div><p className="eyebrow">{m.sellerTools}</p><h2>{m.accountSellerApproved}</h2></div>
          <Link className="btn btn-secondary" href={`/${locale}/seller`}>{m.sellerPanel}</Link>
          <Link className="btn btn-secondary" href={`/${locale}/seller/products`}>{m.myProducts}</Link>
          <Link className="btn btn-secondary" href={`/${locale}/seller/orders`}>{sellerOrdersUi[locale].title}</Link>
          <Link className="btn btn-primary" href={`/${locale}/seller/products/new`}>{m.addProduct}</Link>
        </section>
      ) : null}
    </div>
  );
}
