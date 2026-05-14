import { Card } from "../components/ui/Card";

export function AboutPage() {
  return (
    <div className="page-stack readable-panel">
      <p className="eyebrow">About mi-log</p>
      <h1>A small publishing surface with local ownership at the center.</h1>
      <p className="lede">
        mi-log starts from the assumption that a reader-facing blog does not need
        public accounts, tracking, or a cloud database to be useful.
      </p>

      <div className="card-grid">
        <Card>
          <h2>Local-first</h2>
          <p>
            Drafts, database state, and publishing workflows stay on the owner
            machine. The public side only reads content that has already been
            published.
          </p>
        </Card>
        <Card>
          <h2>DNS-free philosophy</h2>
          <p>
            DNS can be convenient, but it is not the root of identity here. The
            project is designed to work toward addressable surfaces that do not
            depend on owning a domain name.
          </p>
        </Card>
        <Card>
          <h2>Readonly public surface</h2>
          <p>
            Public readers can list and read published posts. They cannot log in,
            create content, edit content, or see drafts.
          </p>
        </Card>
        <Card>
          <h2>Tor and IPFS direction</h2>
          <p>
            Future work points toward Tor reachability and signed manifest or
            IPFS verification, without presenting unfinished crypto as a feature.
          </p>
        </Card>
      </div>
    </div>
  );
}
