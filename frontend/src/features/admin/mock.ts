import type { CancellationRequest, Report, WithdrawalRequest } from "./types";

/*
 * 시연용 샘플 데이터. 실제 서비스나 사용자와 관계없다.
 * 모집 건 이름은 모집 목업을 재사용하고, 시각은 기준 시각에서 몇 시간 전으로 만든다.
 * 그래서 언제 열어도 같은 신고에 "72시간 지남"이 붙는다.
 */

const HOUR_MS = 60 * 60 * 1000;
const hoursAgo = (now: Date, hours: number) => new Date(now.getTime() - hours * HOUR_MS).toISOString();

/** 신고 키 목록. 상세 주소가 없는 신고인지 데이터를 읽기 전에 알 수 있게 따로 둔다 */
export const REPORT_KEYS = ["report-1", "report-2", "report-3", "report-4", "report-5", "report-6"];

/** 검토 대기 4건과 이미 처리한 2건 */
export function buildReports(now: Date): Report[] {
  return [
    {
      id: "report-1",
      targetType: "feedback",
      recruitmentName: "회의록 정리",
      recruitmentSlug: "meeting-notes",
      reason: "요청한 기능을 써 보지 않고 제출했어요",
      reporterNickname: "정하린",
      targetNickname: "오태민",
      feedback: "잘 되는 것 같아요. 특별히 불편한 점은 없었어요.",
      createdAt: hoursAgo(now, 80),
      holdsReward: true,
    },
    {
      id: "report-2",
      targetType: "feedback",
      recruitmentName: "북로그",
      recruitmentSlug: "booklog",
      reason: "같은 문장을 반복한 피드백이에요",
      reporterNickname: "박도현",
      targetNickname: "윤소희",
      feedback: "좋아요 좋아요 좋아요. 책 등록이 좋아요. 기록도 좋아요. 좋아요.",
      createdAt: hoursAgo(now, 30),
      holdsReward: true,
    },
    {
      id: "report-3",
      targetType: "recruitment",
      recruitmentName: "포트폴리오 빌더",
      recruitmentSlug: "folio-builder",
      reason: "모집 글과 실제 서비스 내용이 달라요",
      reporterNickname: "한서윤",
      createdAt: hoursAgo(now, 50),
      holdsReward: false,
    },
    {
      id: "report-4",
      targetType: "user",
      recruitmentName: "가계부 노트",
      recruitmentSlug: "ledger-note",
      reason: "채팅에서 부적절한 표현을 썼어요",
      reporterNickname: "최유나",
      targetNickname: "강민서",
      createdAt: hoursAgo(now, 6),
      holdsReward: false,
    },
    {
      id: "report-5",
      targetType: "feedback",
      recruitmentName: "레시피핏",
      recruitmentSlug: "recipefit",
      reason: "버그 설명이 실제와 달라요",
      reporterNickname: "박도현",
      targetNickname: "이지우",
      feedback: "재료를 세 개 넣으면 추천 결과가 비어 있어요. 두 개일 때는 잘 나와요.",
      createdAt: hoursAgo(now, 100),
      holdsReward: true,
      review: { decision: "dismissed", memo: "재현해 보니 실제 버그였어요.", processedAt: hoursAgo(now, 20) },
    },
    {
      id: "report-6",
      targetType: "feedback",
      recruitmentName: "스터디 매칭",
      recruitmentSlug: "study-match",
      reason: "다른 모집 건의 피드백을 그대로 붙여 넣었어요",
      reporterNickname: "정하린",
      targetNickname: "서준호",
      feedback: "가계부 입력이 편하고 월별 통계가 보기 좋아요.",
      createdAt: hoursAgo(now, 120),
      holdsReward: true,
      review: { decision: "upheld", memo: "다른 서비스에 대한 내용이에요.", processedAt: hoursAgo(now, 50) },
    },
  ];
}

export function buildWithdrawals(now: Date): WithdrawalRequest[] {
  return [
    { id: "withdrawal-1", nickname: "이지우", amount: 5000, createdAt: hoursAgo(now, 60) },
    { id: "withdrawal-2", nickname: "김민준", amount: 8200, createdAt: hoursAgo(now, 26) },
    { id: "withdrawal-3", nickname: "한서윤", amount: 12000, createdAt: hoursAgo(now, 3) },
  ];
}

export function buildCancellations(now: Date): CancellationRequest[] {
  return [
    {
      id: "cancellation-1",
      recruitmentName: "레시피핏",
      developerNickname: "박도현",
      confirmedCount: 3,
      createdAt: hoursAgo(now, 40),
    },
    {
      id: "cancellation-2",
      recruitmentName: "동네 러닝 크루",
      developerNickname: "최유나",
      confirmedCount: 0,
      createdAt: hoursAgo(now, 10),
    },
  ];
}
