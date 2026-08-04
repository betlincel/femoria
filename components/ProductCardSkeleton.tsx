export function ProductCardSkeleton() {
  return (
    <div className="product-card skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-image" />
      <div className="product-body">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line title" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton-facts">
          <div className="skeleton skeleton-block" />
          <div className="skeleton skeleton-block" />
        </div>
        <div className="skeleton-foot">
          <div className="skeleton skeleton-line medium" />
          <div className="skeleton skeleton-circle" />
        </div>
      </div>
    </div>
  );
}
