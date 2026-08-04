export default function AdminProducerApplicationsLoading() {
  return (
    <section className="section admin-applications-loading" aria-busy="true" aria-live="polite">
      <div className="container">
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-line route-loading-title" />
        <div className="admin-loading-grid" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="admin-loading-card skeleton" key={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
