import {
  createServer as createHttpServer,
  request as httpRequest,
} from "node:http";
import { once } from "node:events";
import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";

process.env.DESKTOP_CONTROL_SECRET = "test-desktop-control-secret";

const { DESKTOP_CONTROL_HEADER } = await import("./requireDesktopControl.js");
const { createServer } = await import("../server/createServer.js");

type TestResponse = Readonly<{
  status: number;
  body: string;
}>;

async function withServer(
  fn: (base: { port: number }) => Promise<void>,
): Promise<void> {
  const app = createServer();
  const server = createHttpServer(app);

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    await fn({ port: address.port });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function requestLocal(
  port: number,
  headers: Record<string, string>,
): Promise<TestResponse> {
  return await new Promise<TestResponse>((resolve, reject) => {
    const request = httpRequest(
      {
        headers: {
          Accept: "application/json",
          ...headers,
        },
        hostname: "127.0.0.1",
        method: "GET",
        path: "/api/v1/auth/session",
        port,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    request.on("error", reject);
    request.end();
  });
}

test("desktop mode rejects local browser auth without desktop control header", async () => {
  await withServer(async ({ port }) => {
    const response = await requestLocal(port, {
      Host: "localhost",
    });

    assert.equal(response.status, 403);
    assert.match(response.body, /DESKTOP_CONTROL_REQUIRED/);
  });
});

test("desktop mode still rejects onion Host headers with desktop control", async () => {
  await withServer(async ({ port }) => {
    const response = await requestLocal(port, {
      [DESKTOP_CONTROL_HEADER]: "test-desktop-control-secret",
      Host: "exampleaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.onion",
    });

    assert.equal(response.status, 403);
    assert.match(response.body, /LOCAL_ADMIN_HOST_REQUIRED/);
  });
});
