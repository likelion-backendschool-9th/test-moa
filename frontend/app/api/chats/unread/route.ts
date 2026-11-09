import { backendFetch, isBackendAuth } from "@/lib/backend";
import { connection } from "next/server";

export async function GET() {
  await connection();
  if (!isBackendAuth) return new Response(null, { status: 404 });
  const result = await backendFetch<{ count: number }>("/api/v1/chats/unread");
  if (!result.ok) return new Response(null, { status: result.status });
  return Response.json({ count: result.data.count });
}
