export function AdminNotAvailablePage() {
  return (
    <main className="admin-unavailable">
      <section className="readable-panel">
        <p className="eyebrow">Localhost only</p>
        <h1>Admin is not available from this request boundary.</h1>
        <p className="lede">
          The writing interface is intentionally limited to local access. Public
          readers only get the readonly blog surface.
        </p>
      </section>
    </main>
  );
}
