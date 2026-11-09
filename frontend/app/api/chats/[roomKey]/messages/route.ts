import { getChatMessages } from "@/features/chat/api";
import { isBackendAuth } from "@/lib/backend";
import { connection } from "next/server";

export async function GET(request: Request, context: { params: Promise<{ roomKey: string }> }) {
  await connection();
  if (!isBackendAuth) return new Response(null, { status: 404 });
  const { roomKey } = await context.params;
  const params = new URL(request.url).searchParams;
  const before = params.get("before");
  const after = params.get("after");
  if ((before !== null && (!/^\d+$/.test(before) || !Number.isSafeInteger(Number(before)) || Number(before) < 1)) ||
      (after !== null && (!/^\d+$/.test(after) || !Number.isSafeInteger(Number(after)))) ||
      (before !== null && after !== null)) {
    return Response.json({ message: "메시지 조회 조건이 올바르지 않아요." }, { status: 400 });
  }
  try {
    return Response.json(await getChatMessages(roomKey, {
      ...(before !== null && { before: Number(before) }),
      ...(after !== null && { after: Number(after) }),
    }));
  } catch (error) {
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 500;
    return Response.json({ message: "메시지를 불러오지 못했어요." }, { status });
  }
}
