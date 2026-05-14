import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="site-main" id="main-content">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
