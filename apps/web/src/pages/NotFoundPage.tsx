import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="page-stack readable-panel">
      <p className="eyebrow">404</p>
      <h1>This public path is not here.</h1>
      <p className="lede">
        The readable surface is small on purpose: posts, post detail, about, and
        proof.
      </p>
      <Link className="text-link" to="/">
        Return to posts
      </Link>
    </div>
  );
}
