export function LoadingSpinner({
  label,
  compact = false,
}: {
  label: string;
  compact?: boolean;
}) {
  return (
    <span className={`loading-spinner ${compact ? "compact" : ""}`} role="status">
      <span className="spinner-mark" aria-hidden="true">F</span>
      <span>{label}</span>
    </span>
  );
}
