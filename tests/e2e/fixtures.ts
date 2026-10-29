import { test as base, expect } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
const origin = "http://127.0.0.1:3108";
type Server = { restart: () => Promise<void>; logs: () => string };
export const test = base.extend<{ isolatedApp: void }, { app: Server }>({
  app: [
    async ({}, useApp) => {
      const directory = mkdtempSync(join(tmpdir(), "honeyhole-browser-"));
      const env = {
        ...process.env,
        HONEYHOLE_DATA_DIR: directory,
        BETTER_AUTH_URL: origin,
        BETTER_AUTH_SECRET: randomBytes(48).toString("base64url"),
        NEXT_TELEMETRY_DISABLED: "1",
      };
      let child: ChildProcess | undefined,
        logs = "";
      async function stop() {
        const running = child;
        child = undefined;
        if (!running || running.exitCode !== null) return;
        const stopped = new Promise<void>((resolve) =>
          running.once("exit", () => resolve()),
        );
        running.kill("SIGTERM");
        const kill = setTimeout(() => running.kill("SIGKILL"), 5000);
        await stopped;
        clearTimeout(kill);
      }
      async function start() {
        child = spawn(
          process.execPath,
          [
            "--import",
            "./tests/e2e/provider-hook.mjs",
            "node_modules/next/dist/bin/next",
            "start",
            "--hostname",
            "127.0.0.1",
            "--port",
            "3108",
          ],
          { env, stdio: ["ignore", "pipe", "pipe"] },
        );
        child.stdout!.on("data", (d) => {
          logs += d;
        });
        child.stderr!.on("data", (d) => {
          logs += d;
        });
        for (let i = 0; i < 100; i++) {
          if (child.exitCode !== null)
            throw Error("Test application exited: " + logs);
          try {
            if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok)
              return;
          } catch {}
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw Error("Test application did not start: " + logs);
      }
      try {
        const init = spawn(
          process.execPath,
          ["--import", "tsx", "tests/e2e/setup-storage.ts"],
          { env, stdio: ["ignore", "pipe", "pipe"] },
        );
        init.stderr!.on("data", (d) => {
          logs += d;
        });
        const code = await new Promise((resolve) => init.once("exit", resolve));
        if (code !== 0)
          throw Error("Test storage initialization failed: " + logs);
        await start();
        await useApp({
          restart: async () => {
            await stop();
            await start();
          },
          logs: () => logs,
        });
      } finally {
        await stop();
        rmSync(directory, { recursive: true, force: true });
      }
    },
    { scope: "worker" },
  ],
  isolatedApp: [
    async ({ app, context }, use, testInfo) => {
      // No external map tiles or browser requests; real same-origin app/API requests continue.
      await context.route("**/*", (route) =>
        new URL(route.request().url()).origin === origin
          ? route.continue()
          : route.abort(),
      );
      await use();
      if (testInfo.status !== testInfo.expectedStatus)
        await testInfo.attach("application.log", {
          body: app.logs(),
          contentType: "text/plain",
        });
    },
    { auto: true },
  ],
});
export { expect };
