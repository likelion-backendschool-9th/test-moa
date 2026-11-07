import Link from "next/link";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { RecruitmentThumb } from "@/features/recruitment/components/RecruitmentThumb/RecruitmentThumb";
import type { Recruitment } from "@/features/recruitment/types";

/*
 * 교정지 더미: 작업대 위에 흩어 놓은 교정지처럼 기울여 겹친다.
 * 기울기와 위아래 비켜 놓기는 바깥 칸(li)에, hover·포커스 때 떠오르기는 안쪽 링크에 둬서 모든 장이 똑같이 12px 움직인다.
 * 왼쪽 글 칸은 한 줄 제목이 들어가는 폭(max-content)에 맞추고 나머지를 더미에 준다. 겹침은 10%로 같다.
 * 1280px 이상은 세 장(폭 40%, 40 × 3 − 10 × 2 = 100), 1024~1279px은 칸이 좁아 두 장(폭 55%, 55 × 2 − 10 = 100)만 크게 놓는다.
 * 어느 쪽이든 각 장의 4분의 3 이상이 보여 긴 서비스 이름도 가려지지 않는다. 배너 높이(22rem) 안에 들어가게 위아래 엇갈림은 0·16·32px로 작게 둔다.
 */
const SHEET_POSE = ["-rotate-6 mt-4", "-ml-[10%] rotate-2", "-ml-[10%] mt-8 rotate-[7deg] hidden xl:block"];

/**
 * 배너 첫 슬라이드. 서비스 소개 문구는 README에 확정된 사실만 쓴다.
 * 1024px 이상에서는 넓어진 오른쪽 칸에 최근 모집 글 썸네일을 교정지 더미로 놓고, 768px 미만에서는 한 장만 글과 버튼 사이에 놓는다. 누르면 그 모집으로 간다.
 */
export function ServiceIntroSlide({ recent = [] }: { recent?: Recruitment[] }) {
  return (
    <div className="grid h-full items-center gap-10 lg:grid-cols-[max-content_minmax(0,1fr)] xl:gap-16">
      {/* 제목·설명은 위에 붙이고 버튼은 아래에 붙인다. 배너 높이가 고정이라 남는 높이는 그 사이로 간다 */}
      <div className="flex h-full flex-col justify-between gap-5 lg:gap-6">
        <div className="flex flex-col gap-4 lg:gap-5">
          {/* 제목은 어느 폭에서도 한 줄이다. 좁은 화면은 화면 폭에 맞춰 글자를 줄인다(320px 폭에서 약 29px) */}
          <h2 className="text-[clamp(1.75rem,9vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.04em] whitespace-nowrap lg:text-[3.25rem] xl:text-[4rem]">
            써 보고, 남기고, <span className="text-accent">받고</span>
          </h2>
          <p className="text-lg text-text-muted">새 서비스를 써 보고 피드백을 남기면 크레딧을 받아요.</p>
        </div>
        {/* 768px 미만은 더미 대신 최근 모집 글 한 장을 글과 버튼 사이에 비스듬히 놓아 빈 높이를 채운다 */}
        {recent[0] && (
          <Link
            href={`/recruitments/${recent[0].slug}`}
            aria-label={`${recent[0].projectName} 모집 보기`}
            className="block w-[72%] -rotate-3 self-center rounded-2xl outline-offset-4 md:hidden"
          >
            <RecruitmentThumb recruitment={recent[0]} showImage />
          </Link>
        )}
        <div className="hero-action">
          <LinkButton href="#all-tests">테스트 둘러보기</LinkButton>
        </div>
      </div>
      {recent.length > 0 && (
        <ul aria-label="최근 올라온 테스트" className="hidden items-start pb-10 lg:flex">
          {recent.slice(0, SHEET_POSE.length).map((item, index) => (
            <li key={item.slug} className={`w-[55%] shrink-0 hover:z-10 focus-within:z-10 xl:w-[40%] ${SHEET_POSE[index]}`}>
              <Link
                href={`/recruitments/${item.slug}`}
                aria-label={`${item.projectName} 모집 보기`}
                className="block rounded-2xl outline-offset-4 transition-transform duration-500 ease-brand hover:-translate-y-3 focus-visible:-translate-y-3"
              >
                <RecruitmentThumb recruitment={item} showImage />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
