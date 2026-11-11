import { proxyBackendFile } from "@/lib/backend-proxy";

const ID = /^[1-9][0-9]{0,18}$/;

/** 신고 증거 파일(#85). 공개 주소가 없어 로그인 토큰을 붙여 받아 온다. 신고한 본인과 운영자만 열린다(백엔드가 확인) */
export async function GET(request: Request, context: { params: Promise<{ reportId: string; evidenceId: string }> }) {
  const { reportId, evidenceId } = await context.params;
  if (!ID.test(reportId) || !ID.test(evidenceId)) return new Response(null, { status: 404 });
  return proxyBackendFile(request, `/api/v1/reports/${reportId}/evidences/${evidenceId}`, true);
}
