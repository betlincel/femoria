import Link from "next/link";
import { Icon } from "./Icons";

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="empty-state">
      <span className="empty-mark" aria-hidden="true">
        <Icon name="spark" />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {action ? (
        <Link className="btn btn-primary" href={action.href}>
          {action.label}<Icon name="arrow" />
        </Link>
      ) : null}
    </div>
  );
}
