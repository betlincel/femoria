export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "terracotta" | "sage" | "gold";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
