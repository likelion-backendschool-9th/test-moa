import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import "./globals.css";

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
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="sr-only rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-on-accent focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-(--z-skip)"
        >
          본문으로 건너뛰기
        </a>
        <AppHeader />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <AppFooter />
      </body>
    </html>
  );
}
