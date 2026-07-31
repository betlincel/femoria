import Link from "next/link";

export function SectionHeader({
  eyebrow,
  title,
  text,
  link,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {text ? <p className="section-description">{text}</p> : null}
      </div>
      {link ? (
        <Link className="text-link" href={link.href}>
          {link.label}
          <span aria-hidden="true">↗</span>
        </Link>
      ) : null}
    </div>
  );
}
