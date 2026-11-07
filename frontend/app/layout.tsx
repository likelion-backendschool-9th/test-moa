import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppHeader } from "@/app/_components/AppHeader/AppHeader";
import "./globals.css";
import styles from "./layout.module.css";

const wantedSans = localFont({
  src: "../node_modules/wanted-sans/fonts/webfonts/variable/complete/woff2/WantedSansVariable.woff2",
  variable: "--font-wanted",
  weight: "400 1000",
  display: "swap",
});

const description = "개발자가 만든 서비스를 먼저 써 보고 피드백을 남기면 크레딧을 받는 테스터 모집 플랫폼이에요.";

export const metadata: Metadata = {
  /* 배포 주소. OG 이미지 같은 절대 URL의 기준이 된다 */
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Test Moa · 테스터 모집 플랫폼", template: "%s · Test Moa" },
  description,
  openGraph: { title: "Test Moa", description, locale: "ko_KR", type: "website" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={wantedSans.variable}>
      <body className={styles.rootLayoutBody}>
        <a
          href="#main"
          className={styles.rootLayoutSrOnly}
        >
          본문으로 건너뛰기
        </a>
        <AppHeader />
        {children}
      </body>
    </html>
  );
}
