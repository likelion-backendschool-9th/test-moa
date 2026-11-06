/*
 * 백엔드(Spring) HTTP 통신. 쿠키나 Next API를 모르고, 토큰은 인자로 받는다.
 * backend.ts(쿠키의 access 토큰을 붙여 부름)와 proxy.ts(refresh 토큰으로 갱신)가 함께 쓴다.
 * 실패를 비로그인으로 볼지 화면에 알릴지는 부르는 쪽이 정한다.
 */

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

/** 백엔드가 응답하지 않을 때 기다리는 시간. 넘으면 백엔드에 닿지 못한 것으로 본다 */
const BACKEND_TIMEOUT_MS = 5000;

export type BackendError = {
  ok: false;
  status: number;
  /** 백엔드 ErrorCode 이름 (예: INVALID_CREDENTIALS). 백엔드에 닿지 못하면 BACKEND_UNAVAILABLE */
  code: string;
  message: string;
  /** 입력 칸별 오류 문구 */
  fields?: Record<string, string>;
};

export type BackendResult<T> = { ok: true; data: T } | BackendError;

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Bearer로 붙일 access 토큰 */
  token?: string;
};

/** 백엔드를 부르고 ApiResponse를 성공·실패로 나눠 돌려준다. 백엔드가 꺼져 있거나 응답이 늦어도 던지지 않는다 */
export async function requestBackend<T>(path: string, { method = "GET", body, token }: RequestOptions = {}): Promise<BackendResult<T>> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, status: 503, code: "BACKEND_UNAVAILABLE", message: "잠시 후 다시 시도해 주세요" };
  }

  const json = await response.json().catch(() => null);
  if (response.ok && json?.success) return { ok: true, data: json.data as T };
  return {
    ok: false,
    status: response.status,
    code: json?.error?.code ?? "INTERNAL_ERROR",
    message: json?.error?.message ?? "잠시 후 다시 시도해 주세요",
    fields: json?.error?.fields,
  };
}
