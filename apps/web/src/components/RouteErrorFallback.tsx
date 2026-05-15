import {
  isRouteErrorResponse,
  Link,
  useRouteError,
} from "react-router-dom";

function errorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.statusText || `Request failed (${error.status})`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}

export function RouteErrorFallback() {
  const error = useRouteError();
  const message = errorMessage(error);

  return (
    <div className="page-stack readable-panel" role="alert">
      <p className="eyebrow">Something broke</p>
      <h1>{message}</h1>
      <p className="lede">
        <Link className="text-link" to="/">
          Return home
        </Link>
      </p>
      <p>
        <button
          className="button button--ghost"
          type="button"
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload page
        </button>
      </p>
    </div>
  );
}
