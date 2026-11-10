import { proxyBackendFile } from "@/lib/backend-proxy";

export async function POST(request: Request) {
  return proxyBackendFile(request, "/api/v1/developer/projects/images", true);
}
