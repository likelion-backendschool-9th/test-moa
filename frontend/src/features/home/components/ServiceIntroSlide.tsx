import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { LinkButton } from "@/components/ui/LinkButton";

/** 배너 첫 슬라이드. 데이터와 무관한 서비스 소개. 문구는 README에 확정된 사실만 쓴다 */
export function ServiceIntroSlide() {
  return (
    <div className="flex flex-col gap-5">
      <DisplayHeading>
        새 서비스를 먼저 <span className="text-accent">써 보고</span> <br className="max-md:hidden" />
        크레딧을 받으세요
      </DisplayHeading>
      <p className="max-w-xl text-lg text-text-muted">
        개발자가 올린 웹서비스를 직접 써 보고 피드백을 남기는 곳이에요. 개발 경험이 없어도 참여할 수 있어요.
      </p>
      <div className="pt-3">
        <LinkButton href="#all-tests">테스트 둘러보기</LinkButton>
      </div>
    </div>
  );
}
