import { proxyBackendFile } from "@/lib/backend-proxy";

export async function POST(request: Request, context: { params: Promise<{ registerId: string }> }) {
  const { registerId } = await context.params;
  if (!/^\d+$/.test(registerId)) return new Response(null, { status: 404 });
  return proxyBackendFile(request, `/api/v1/tester/participations/${registerId}/feedbacks/images`, true);
}
