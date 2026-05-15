import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import { AdminShell } from "./components/admin/AdminShell";
import { RouteErrorFallback } from "./components/RouteErrorFallback";
import { AboutPage } from "./pages/AboutPage";
import { AdminHomePage } from "./pages/admin/AdminHomePage";
import { AdminNewPostPage } from "./pages/admin/AdminNewPostPage";
import { AdminPostEditPage } from "./pages/admin/AdminPostEditPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PostDetailPage } from "./pages/PostDetailPage";
import { ProofPage } from "./pages/ProofPage";
import { SearchPage } from "./pages/SearchPage";

export const router = createBrowserRouter([
  {
    path: "/admin",
    element: <AdminShell />,
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <AdminHomePage /> },
      { path: "new", element: <AdminNewPostPage /> },
      { path: "posts/:id", element: <AdminPostEditPage /> },
    ],
  },
  {
    path: "/",
    element: <App />,
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "search", element: <SearchPage /> },
      { path: "post/:slug", element: <PostDetailPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "proof", element: <ProofPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
