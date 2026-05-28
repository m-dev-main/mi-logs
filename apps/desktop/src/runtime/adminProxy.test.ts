import assert from "node:assert/strict";
import test from "node:test";
import { DesktopAdminProxy } from "./adminProxy";

test("desktop admin proxy refuses requests when lock guard rejects", async () => {
  const proxy = new DesktopAdminProxy({
    beforeRequest: () => {
      throw new Error("Desktop admin locked.");
    },
    controlSecret: "test-secret",
    socketPath: "/tmp/mi-log-test-admin.sock",
  });

  await assert.rejects(
    () => proxy.request({ path: "/api/v1/auth/session" }),
    /Desktop admin locked/,
  );
});

