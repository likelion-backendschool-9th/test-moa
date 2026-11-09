import path from "node:path";
import type { NextConfig } from "next";

const root = path.resolve(import.meta.dirname);

const nextConfig: NextConfig = {
  // Docker 이미지에 실행에 필요한 파일만 담기 위해 .next/standalone을 만든다
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingRoot: root,
  async redirects() {
    /* 옛 출금 상세 주소를 목록 모달(?open=)로 보낸다 */
    return [{ source: "/admin/withdrawals/:withdrawalKey", destination: "/admin/withdrawals?open=:withdrawalKey", permanent: true }];
  },
  turbopack: {
    root,
  },
  experimental: {
    /* 신고 증거 파일(한 장 5MB, 5장)을 서버 액션으로 받는다. 백엔드·nginx 한도(30MB)와 맞춘다 */
    serverActions: { bodySizeLimit: "30mb" },
    proxyClientMaxBodySize: "30mb",
  },
};

export default nextConfig;
