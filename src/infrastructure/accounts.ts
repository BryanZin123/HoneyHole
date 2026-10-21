import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { readFileSync, chmodSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { SqliteUserData } from "./sqlite-user-data";
export async function openAccounts(config: {
  file: string;
  secret: string;
  origin: string;
  migrate?: boolean;
}) {
  if (config.secret.length < 32)
    throw Error("Account secret must contain at least 32 characters.");
  const url = new URL(config.origin);
  if (
    url.origin !== config.origin ||
    (!["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.protocol !== "https:")
  )
    throw Error("Invalid account origin.");
  const db = new Database(config.file);
  if (config.file !== ":memory:") chmodSync(config.file, 0o600);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  const options = {
    database: db,
    secret: config.secret,
    baseURL: config.origin,
    trustedOrigins: [config.origin],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database" as const,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 10 },
      },
    },
    advanced: {
      useSecureCookies: url.protocol === "https:",
      defaultCookieAttributes: { httpOnly: true, sameSite: "strict" as const },
      ipAddress: { ipAddressHeaders: ["x-honeyhole-local-ip"] },
    },
    logger: { disabled: true },
  };
  try {
    if (config.migrate) {
      await (await getMigrations(options)).runMigrations();
      db.exec(
        "CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)",
      );
      const sql = readFileSync(resolve("migrations/001-user-data.sql"), "utf8"),
        id = "001-user-data",
        checksum = createHash("sha256").update(sql).digest("hex");
      const existing = db
        .prepare("SELECT checksum FROM schema_migrations WHERE id=?")
        .get(id) as { checksum: string } | undefined;
      if (existing && existing.checksum !== checksum)
        throw Error("Applied migration changed; create a new migration.");
      if (!existing)
        db.transaction(() => {
          db.exec(sql);
          db.prepare("INSERT INTO schema_migrations VALUES (?,?,?)").run(
            id,
            checksum,
            new Date().toISOString(),
          );
        })();
    }
    db.prepare("SELECT id FROM schema_migrations WHERE id=?").get(
      "001-user-data",
    );
    const auth = betterAuth(options);
    return {
      db,
      auth,
      repository: new SqliteUserData(db),
      origin: config.origin,
    };
  } catch (e) {
    db.close();
    throw e;
  }
}
