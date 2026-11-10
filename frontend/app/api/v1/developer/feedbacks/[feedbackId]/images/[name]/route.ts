import { isDeveloperFeedbackImageUrl } from "@/features/participation/feedback-images";
import { proxyBackendFile } from "@/lib/backend-proxy";

export async function GET(request: Request, context: { params: Promise<{ feedbackId: string; name: string }> }) {
  const { feedbackId, name } = await context.params;
  const path = `/api/v1/developer/feedbacks/${feedbackId}/images/${name}`;
  if (!isDeveloperFeedbackImageUrl(path)) return new Response(null, { status: 404 });
  return proxyBackendFile(request, path, true);
}
