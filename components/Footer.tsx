"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useState } from "react";
import { productWorlds, type Messages } from "@/lib/i18n";
import { preserveLocalePath } from "@/lib/navigation";
import type { Locale } from "@/lib/types";
import { Icon } from "./Icons";
import { Logo } from "./Logo";

export function Footer({ locale, messages: m }: { locale: Locale; messages: Messages }) {
  const pathname = usePathname();
  const [submitted, setSubmitted] = useState(false);
  const otherLocale = locale === "tr" ? "en" : "tr";
  const otherPath = preserveLocalePath(pathname, otherLocale);

  const submitNewsletter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    event.currentTarget.reset();
  };

  const groups = [
    {
      title: m.footerKitchen,
      links: [
        { href: `/${locale}/kitchen`, label: m.viewKitchen },
        ...productWorlds.kitchen.categories.slice(0, 3).map((item) => ({
          href: `/${locale}/kitchen#categories`,
          label: item[locale],
        })),
      ],
    },
    {
      title: m.footerWorkshop,
      links: [
        { href: `/${locale}/workshop`, label: m.viewWorkshop },
        ...productWorlds.workshop.categories.slice(0, 3).map((item) => ({
          href: `/${locale}/workshop#categories`,
          label: item[locale],
        })),
      ],
    },
    {
      title: m.footerSupport,
      links: [
        { href: `/${locale}/how-it-works`, label: m.nav.howItWorks },
        { href: `/${locale}/guide`, label: m.nav.guide },
        { href: `/${locale}/info/help`, label: m.help },
        { href: `/${locale}/info/safety`, label: m.safety },
        { href: `/${locale}/info/contact`, label: m.contact },
        { href: `/${locale}/info/about`, label: m.about },
      ],
    },
    {
      title: m.producerArea,
      links: [
        { href: `/${locale}/info/producer-application`, label: m.startApplication },
        { href: `/${locale}/producers`, label: m.nav.producers },
        { href: `/${locale}/guide`, label: m.allGuides },
      ],
    },
  ];

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-main">
          <div className="footer-brand">
            <Logo locale={locale} light />
            <p className="footer-summary">{m.footerText}</p>
            <p className="project-note">{m.projectNote}</p>
          </div>
          <div className="footer-links">
            {groups.map((group) => (
              <details className="footer-group" key={group.title} open>
                <summary>{group.title}<Icon name="chevron" size={16} /></summary>
                <ul>
                  {group.links.map((link) => (
                    <li key={`${group.title}-${link.label}`}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
          <div className="footer-newsletter">
            <h3>{m.footerNewsletter}</h3>
            <p>{m.newsletterText}</p>
            <form onSubmit={submitNewsletter}>
              <label className="sr-only" htmlFor="newsletter-email">{m.email}</label>
              <input id="newsletter-email" type="email" required placeholder={m.emailPlaceholder} />
              <button type="submit" aria-label={m.subscribe}><Icon name="arrow" /></button>
            </form>
            {submitted ? <p className="newsletter-status" role="status">{m.newsletterUnavailable}</p> : null}
            <div className="footer-social" aria-label={m.footerCommunity}>
              <Link href={`/${locale}/info/community`}>{m.socialInstagram}</Link>
              <Link href={`/${locale}/info/community`}>{m.socialPinterest}</Link>
              <Link href={`/${locale}/info/community`}>{m.socialLinkedIn}</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{m.copyright}</span>
          <nav aria-label={m.footerLegal}>
            <Link href={`/${locale}/info/privacy`}>{m.privacy}</Link>
            <Link href={`/${locale}/info/terms`}>{m.terms}</Link>
            <Link href={`/${locale}/info/cookies`}>{m.cookies}</Link>
          </nav>
          <div className="footer-language" aria-label={m.footerLanguage}>
            <Link href={preserveLocalePath(pathname, locale)} aria-current="page">{locale.toUpperCase()}</Link>
            <span aria-hidden="true">·</span>
            <Link href={otherPath}>{otherLocale.toUpperCase()}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
