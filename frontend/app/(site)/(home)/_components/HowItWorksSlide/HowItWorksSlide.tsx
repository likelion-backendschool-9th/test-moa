import { ProofStamp } from "@/features/recruitment/components/ProofStamp/ProofStamp";
import { cn } from "@/lib/cn";
import styles from "./HowItWorksSlide.module.css";

/*
 * 배너 두 번째 슬라이드: 교정 체크리스트. 왼쪽에 제목과 보상 약속, 오른쪽에 1° 기운 교정지 한 장 위 네 줄 확인 목록.
 * 줄 앞에 교정지 글자색(on-thumb)을 40%로 흐린 교정 체크(다크에서도 밝은 교정지 위라 보인다), 마지막 줄(크레딧을 받는 순간)만 강조색 체크와 '크레딧 지급' 도장.
 * 문구는 PRODUCT.md에 확정된 사실(72시간 뒤 자동 지급, 1크레딧 = 1원, 버그를 못 찾아도 보상)만 쓴다.
 *
 * 768px 이상에서 조작부는 배너 오른쪽 아래에 떠 있어서 교정지 아래에만 조작부 높이만큼 띠를 비운다(왼쪽 약속 문구는 1번 장 버튼처럼 맨 아래에 붙는다).
 * 왼쪽 칸은 제목·약속 문구 폭(max-content)에 맞추고, 교정지는 한 줄 글이 너무 길게 늘어지지 않게 최대 36rem으로 묶고, 1번 장 카드 더미와 오른쪽 끝선이 맞게 오른쪽에 붙인다.
 */
const STEPS = ["지원해요", "참여가 확정되면 써 봐요", "피드백을 내요", "72시간 뒤 크레딧을 받아요"];

function CheckMark({ accent }: { accent: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn(styles.checkMark, accent ? styles.checkMarkAccent : styles.checkMarkMuted)}>
      <path d="M3.5 12.5 9 18 20.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HowItWorksSlide() {
  return (
    /*
      큰 제목은 위에, 보상 약속은 아래에 붙이고 교정지는 그 사이(768px 이상은 오른쪽)에서 세로 가운데에 둔다.
      좁은 화면은 제목 → 교정지 → 약속 순서로 위아래에 붙인다.
    */
    <div className={styles.root}>
      <h2 className={styles.title}>이렇게 진행돼요</h2>
      <ul className={styles.list}>
        <li>
          <span className={styles.label}>1크레딧은 1원</span>으로 출금할 수 있어요
        </li>
        <li>
          개발 경험이 없어도 <span className={styles.label2}>느낀 점만 남기면</span> 보상을 받아요
        </li>
      </ul>
      <div data-hero-paper className={styles.box}>
        <ol className={styles.list2}>
          {STEPS.map((step, index) => {
            const last = index === STEPS.length - 1;
            return (
              <li key={step} className={styles.root2}>
                <CheckMark accent={last} />
                <span className={styles.step}>{step}</span>
                {last && <ProofStamp label="크레딧 지급" placement="inline" />}
                {last && <ProofStamp label="크레딧 지급" placement="edge" />}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
