import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { openAccounts } from "../src/infrastructure/accounts";
async function main() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const directory = resolve(process.env.HONEYHOLE_DATA_DIR ?? ".data");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const secretPath = resolve(directory, "auth-secret");
  if (!process.env.BETTER_AUTH_SECRET && !existsSync(secretPath))
    writeFileSync(secretPath, randomBytes(48).toString("base64url"), {
      mode: 0o600,
      flag: "wx",
    });
  const secret =
    process.env.BETTER_AUTH_SECRET ?? readFileSync(secretPath, "utf8").trim();
  const store = await openAccounts({
    file: resolve(directory, "honeyhole.sqlite"),
    secret,
    origin: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    migrate: true,
  });
  store.db.close();
  console.log(
    "Account schema and private local storage initialized. No secret values printed.",
  );
}
main().catch(() => {
  console.error(
    "Storage initialization failed. Check local directory permissions and configuration.",
  );
  process.exitCode = 1;
});
