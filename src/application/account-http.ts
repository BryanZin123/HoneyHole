import {
  UserDataError,
  validatePin,
  validatePreferences,
} from "../domain/user-data";
import type { UserDataRepository } from "./user-data-repository";
interface SessionIdentity {
  user: { id: string; name: string; email: string };
}
export interface AccountServices {
  origin: string;
  auth: {
    handler: (request: Request) => Promise<Response>;
    api: {
      getSession: (input: {
        headers: Headers;
      }) => Promise<SessionIdentity | null>;
    };
  };
  repository: UserDataRepository;
  resolveLocation?: (
    id: string,
  ) => Promise<{ name: string; latitude: number; longitude: number } | null>;
}
const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
  "X-API-Version": "1",
};
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers });
export async function body(request: Request) {
  if (
    !(request.headers.get("content-type") ?? "").startsWith("application/json")
  )
    throw new UserDataError(415, "JSON required.");
  const reader = request.body?.getReader();
  if (!reader) throw new UserDataError(400, "Invalid JSON.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 16000) {
      await reader.cancel();
      throw new UserDataError(413, "Request too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const text = new TextDecoder().decode(bytes);
  try {
    return JSON.parse(text);
  } catch {
    throw new UserDataError(400, "Invalid JSON.");
  }
}
export async function handleAccountRequest(
  request: Request,
  services: AccountServices,
): Promise<Response> {
  try {
    const url = new URL(request.url),
      path = url.pathname,
      method = request.method;
    if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method))
      return json({ error: "Method not allowed." }, 405);
    if (method !== "GET" && request.headers.get("origin") !== services.origin)
      return json({ error: "Request origin rejected." }, 403);
    if (path.startsWith("/api/auth/")) {
      if (
        method !== "POST" ||
        ![
          "/api/auth/sign-up/email",
          "/api/auth/sign-in/email",
          "/api/auth/sign-out",
        ].includes(path)
      )
        return json({ error: "Not found." }, 404);
      const input = await body(request);
      // Reject unrequested profile/redirect fields and cap inputs before library validation.
      const allowed = path.endsWith("sign-up/email")
        ? ["email", "password", "name"]
        : path.endsWith("sign-in/email")
          ? ["email", "password"]
          : [];
      if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.keys(input).some((k) => !allowed.includes(k))
      )
        return json({ error: "Invalid account request." }, 400);
      if (
        allowed.length &&
        (typeof input.email !== "string" ||
          input.email.length > 254 ||
          typeof input.password !== "string" ||
          input.password.length > 128 ||
          (allowed.includes("name") &&
            (typeof input.name !== "string" ||
              !input.name.trim() ||
              input.name.length > 100)))
      )
        return json({ error: "Invalid account request." }, 400);
      const forwarded = new Headers(request.headers);
      forwarded.set("x-honeyhole-local-ip", "127.0.0.1");
      const result = await services.auth.handler(
        new Request(services.origin + path, {
          method: "POST",
          headers: forwarded,
          body: JSON.stringify(input),
        }),
      );
      // Session secrets remain exclusively in HttpOnly cookies, not returned JSON.
      const out = json(
        result.ok
          ? { ok: true }
          : {
              error:
                "Account request could not be completed. Check your credentials or try again later.",
            },
        result.status,
      );
      for (const cookie of result.headers.getSetCookie())
        out.headers.append("Set-Cookie", cookie);
      return out;
    }
    const session = await services.auth.api.getSession({
      headers: request.headers,
    });
    if (!session) return json({ error: "Sign in required." }, 401);
    const owner = session.user.id,
      repo = services.repository;
    if (path === "/api/v1/me" && method === "GET")
      return json({
        user: { id: owner, name: session.user.name, email: session.user.email },
        recoveryAvailable: false,
      });
    if (path === "/api/v1/preferences") {
      if (method === "GET") return json(repo.preferences(owner));
      if (method === "PUT")
        return json(
          repo.savePreferences(owner, validatePreferences(await body(request))),
        );
    }
    if (path === "/api/v1/pins") {
      if (method === "GET") return json(repo.list(owner));
      if (method === "POST") {
        const p = validatePin(await body(request));
        if (p.sourceId) {
          if (!services.resolveLocation)
            throw new UserDataError(503, "Location source unavailable.");
          const source = await services.resolveLocation(p.sourceId);
          if (!source)
            throw new UserDataError(404, "Source location not found.");
          p.latitude = source.latitude;
          p.longitude = source.longitude;
        }
        return json(repo.create(owner, p), 201);
      }
    }
    const match = path.match(/^\/api\/v1\/pins\/([a-zA-Z0-9-]{1,64})$/);
    if (match) {
      if (method === "GET") return json(repo.get(owner, match[1]));
      if (method === "PATCH") {
        const existing = repo.get(owner, match[1]);
        const p = validatePin(await body(request));
        if (p.sourceId !== existing.sourceId)
          throw new UserDataError(400, "Source reference cannot be changed.");
        if (
          p.sourceId &&
          (p.latitude !== existing.latitude ||
            p.longitude !== existing.longitude)
        )
          throw new UserDataError(
            400,
            "Create a custom pin to use other coordinates.",
          );
        return json(repo.update(owner, match[1], p));
      }
      if (method === "DELETE") {
        repo.delete(owner, match[1]);
        return new Response(null, { status: 204, headers });
      }
    }
    return json({ error: "Not found." }, 404);
  } catch (e) {
    if (e instanceof UserDataError) return json({ error: e.message }, e.status);
    return json({ error: "Account data is temporarily unavailable." }, 503);
  }
}
