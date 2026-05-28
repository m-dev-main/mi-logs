import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function findWorkspaceRoot(startDir: string): string {
  let current = resolve(startDir);

  while (true) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error("Could not locate pnpm-workspace.yaml for mi-log.");
    }

    current = parent;
  }
}

