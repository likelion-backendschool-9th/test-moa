import "server-only";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-tokens";
import { isBackendAuth } from "@/lib/backend";
import { BACKEND_URL } from "@/lib/backend-http";

/** Route Handler의 파일 본문을 JSON 변환 없이 전달하고 백엔드의 상태·형식·캐시 정책을 보존한다. */
export async function proxyBackendFile(request: Request, path: string, withToken: boolean) {
  if (!isBackendAuth) return new Response(null, { status: 404 });
  const headers = new Headers();
  if (withToken) {
    const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
    if (!token) return Response.json({ error: { message: "로그인해 주세요" } }, { status: 401 });
    headers.set("Authorization", `Bearer ${token}`);
  }
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  try {
    const options: RequestInit & { duplex?: "half" } = {
      method: request.method, headers, cache: "no-store", signal: AbortSignal.timeout(30_000),
    };
    if (request.method === "POST") {
      options.body = request.body;
      options.duplex = "half";
    }
    const result = await fetch(`${BACKEND_URL}${path}`, options);
    const responseHeaders = new Headers();
    for (const name of ["content-type", "cache-control", "x-content-type-options", "content-disposition"]) {
      const value = result.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(result.body, { status: result.status, headers: responseHeaders });
  } catch {
    return Response.json({ error: { message: "이미지를 전송하지 못했어요. 다시 시도해 주세요" } }, { status: 503 });
  }
}
