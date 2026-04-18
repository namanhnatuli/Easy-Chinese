export default function SettingsLoading() {
  return (
    <div className="page-shell">
      <section className="surface-panel h-48 animate-pulse bg-muted/40" />
      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="surface-panel h-52 animate-pulse bg-muted/40" />
          ))}
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="surface-panel h-56 animate-pulse bg-muted/40" />
          ))}
        </div>
      </section>
    </div>
  );
}
