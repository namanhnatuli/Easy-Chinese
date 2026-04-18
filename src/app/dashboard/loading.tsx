export default function DashboardLoading() {
  return (
    <div className="page-shell">
      <section className="surface-panel h-48 animate-pulse bg-muted/40" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="surface-panel h-36 animate-pulse bg-muted/40" />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="surface-panel h-96 animate-pulse bg-muted/40" />
        <div className="surface-panel h-96 animate-pulse bg-muted/40" />
      </section>
    </div>
  );
}
