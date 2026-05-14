import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import { AdminShell } from "./components/admin/AdminShell";
import { AboutPage } from "./pages/AboutPage";
import { AdminHomePage } from "./pages/admin/AdminHomePage";
import { AdminNewPostPage } from "./pages/admin/AdminNewPostPage";
import { AdminPostEditPage } from "./pages/admin/AdminPostEditPage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PostDetailPage } from "./pages/PostDetailPage";
import { ProofPage } from "./pages/ProofPage";

export const router = createBrowserRouter([
  {
    path: "/admin",
    element: <AdminShell />,
    children: [
      { index: true, element: <AdminHomePage /> },
      { path: "new", element: <AdminNewPostPage /> },
      { path: "posts/:id", element: <AdminPostEditPage /> },
    ],
  },
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "post/:slug", element: <PostDetailPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "proof", element: <ProofPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
