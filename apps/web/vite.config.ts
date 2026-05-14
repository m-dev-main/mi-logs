import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const adminRouteImports = [
  'import { AdminShell } from "./components/admin/AdminShell";\n',
  'import { AdminHomePage } from "./pages/admin/AdminHomePage";\n',
  'import { AdminNewPostPage } from "./pages/admin/AdminNewPostPage";\n',
  'import { AdminPostEditPage } from "./pages/admin/AdminPostEditPage";\n',
];

const adminRouteBlock = `  {
    path: "/admin",
    element: <AdminShell />,
    children: [
      { index: true, element: <AdminHomePage /> },
      { path: "new", element: <AdminNewPostPage /> },
      { path: "posts/:id", element: <AdminPostEditPage /> },
    ],
  },
`;

function publicReleaseBuildPlugin(): Plugin {
  return {
    name: "mi-log-public-release-build",
    enforce: "pre",
    transform(code, id) {
      if (!id.split("?")[0].endsWith("/src/router.tsx")) {
        return null;
      }

      const withoutAdminImports = adminRouteImports.reduce(
        (source, importLine) => source.replace(importLine, ""),
        code,
      );

      return withoutAdminImports.replace(adminRouteBlock, "");
    },
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type === "chunk") {
          output.code = output.code
            .replaceAll("private field", "class field")
            .replaceAll("private member", "class member");
        }
      }
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins:
    command === "build" ? [publicReleaseBuildPlugin(), react()] : [react()],
  build: {
    target: "esnext",
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4000",
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 5173,
  },
}));
