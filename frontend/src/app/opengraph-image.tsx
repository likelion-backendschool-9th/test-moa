import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Test Moa · 써 보고, 남기고, 받고";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* ImageResponse는 CSS 변수를 읽지 못해서 globals.css의 라이트 토큰 값을 그대로 쓴다 */
const COLORS = { surface: "#ffffff", text: "#1a1a1a", muted: "#5c5c58", accent: "#129357" };

export default async function Image() {
  /*
   * 이미지 생성기는 Wanted Sans의 GSUB 규칙을 읽지 못한다. 아래 문구의 글자만 남기고 레이아웃 규칙을 뺀 부분 글꼴을 쓴다.
   * 문구를 바꾸면 frontend/README.md의 방법대로 부분 글꼴을 다시 만든다.
   */
  const font = await readFile(join(process.cwd(), "src/app/_og/WantedSans-Bold-og.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: COLORS.surface,
          color: COLORS.text,
          fontFamily: "Wanted Sans Variable",
        }}
      >
        <div style={{ display: "flex", fontSize: 40 }}>test<span style={{ color: COLORS.accent, marginLeft: 10 }}>moa</span></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 96, lineHeight: 1.15, letterSpacing: -3 }}>써 보고, 남기고, 받고</div>
          <div style={{ fontSize: 40, lineHeight: 1.3, color: COLORS.muted }}>새 서비스를 써 보고 피드백을 남기면 크레딧을 받아요.</div>
        </div>
        <div style={{ fontSize: 32, color: COLORS.muted }}>개발 경험이 없어도 참여할 수 있는 테스터 모집 플랫폼</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Wanted Sans Variable", data: font, style: "normal", weight: 700 }] },
  );
}
