import Link from "next/link";
import { Icon } from "./Icons";

export function EmptyState({
  title,
  text,
  action,
  links = [],
  icon = "spark",
}: {
  title: string;
  text: string;
  action?: { href: string; label: string };
  links?: Array<{ href: string; label: string }>;
  icon?: "spark" | "heart" | "bag" | "search";
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark" aria-hidden="true">
        <span className="empty-orbit" />
        <Icon name={icon} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action ? (
        <Link className="btn btn-primary" href={action.href}>
          {action.label}<Icon name="arrow" />
        </Link>
      ) : null}
      {links.length ? <nav className="empty-links" aria-label={title}>{links.map((link) => <Link href={link.href} key={link.href}>{link.label}<Icon name="arrow" size={14} /></Link>)}</nav> : null}
    </div>
  );
}
