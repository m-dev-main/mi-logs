import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Posts" },
  { to: "/about", label: "About" },
  { to: "/proof", label: "Proof" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="site-header__inner">
        <NavLink className="brand-mark" to="/" aria-label="mi-log home">
          <span className="brand-mark__sigil" aria-hidden="true">
            mi
          </span>
          <span>
            <span className="brand-mark__title">mi-log</span>
            <span className="brand-mark__subtitle">local-first notes</span>
          </span>
        </NavLink>
        <nav className="site-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "site-nav__link is-active" : "site-nav__link"
              }
              end={item.to === "/"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
