import { proxyBackendFile } from "@/lib/backend-proxy";
import { isUploadedImageUrl } from "@/features/project/media";

export async function GET(request: Request, context: { params: Promise<{ name: string }> }) {
  const { name } = await context.params;
  const path = `/api/v1/recruitments/images/${name}`;
  if (!isUploadedImageUrl(path)) return new Response(null, { status: 404 });
  return proxyBackendFile(request, path, false);
}
