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
    rules: {
      /*
       * Tailwind는 전역 CSS만 처리한다. .module.css까지 이 규칙을 타면 as: "*.css"로 이름이 바뀌어 CSS Module이 아니게 되고,
       * 클래스 이름이 해시 없이 전역으로 나간다(#160). Tailwind를 빼면 이 규칙도 지운다
       */
      "*.css": {
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
