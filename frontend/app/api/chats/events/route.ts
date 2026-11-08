import { connection } from "next/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-tokens";
import { isBackendAuth } from "@/lib/backend";

export async function GET(request: Request) {
  await connection();
  if (!isBackendAuth) return new Response(null, { status: 204 });

  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  let upstream: Response;
  try {
    upstream = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/chats/events`, {
      headers: { Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      cache: "no-store",
      signal: request.signal,
    });
  } catch {
    return Response.json({ success: false, data: null, error: {
      code: "BACKEND_UNAVAILABLE", message: "잠시 후 다시 시도해 주세요",
    } }, { status: 503 });
  }
  if (upstream.status !== 200) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  }
  return new Response(upstream.body, { headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  } });
}
