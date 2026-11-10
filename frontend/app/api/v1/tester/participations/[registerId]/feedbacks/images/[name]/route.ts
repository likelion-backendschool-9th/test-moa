import { isFeedbackImageUrl } from "@/features/participation/feedback-images";
import { proxyBackendFile } from "@/lib/backend-proxy";

export async function GET(request: Request, context: { params: Promise<{ registerId: string; name: string }> }) {
  const { registerId, name } = await context.params;
  const path = `/api/v1/tester/participations/${registerId}/feedbacks/images/${name}`;
  if (!isFeedbackImageUrl(path)) return new Response(null, { status: 404 });
  return proxyBackendFile(request, path, true);
}
