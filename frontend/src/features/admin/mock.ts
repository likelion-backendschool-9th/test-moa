import type { CancellationRequest, Report, WithdrawalRequest } from "./types";

/*
 * 시연용 샘플 데이터. 실제 서비스나 사용자와 관계없다.
 * 모집 건 이름은 모집 목업을 재사용하고, 시각은 기준 시각에서 몇 시간 전으로 만든다.
 * 그래서 언제 열어도 같은 신고에 "72시간 지남"이 붙는다.
 */

const HOUR_MS = 60 * 60 * 1000;
const hoursAgo = (now: Date, hours: number) => new Date(now.getTime() - hours * HOUR_MS).toISOString();

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

/** 신고 키 목록. 없는 신고인지 쿠키를 읽기 전에 알 수 있게 목업에서 키만 뽑아 둔다 */
export const REPORT_KEYS = buildReports(new Date(0)).map((report) => report.id);

/** 처리 대기 3건과 이미 처리한 2건. 김민준은 예금주가 회원 이름과 다르다 */
export function buildWithdrawals(now: Date): WithdrawalRequest[] {
  return [
    {
      id: "withdrawal-1",
      nickname: "이지우",
      memberName: "이지우",
      amount: 5000,
      bank: "국민",
      accountNumber: "123456789012",
      accountHolder: "이지우",
      createdAt: hoursAgo(now, 60),
    },
    {
      id: "withdrawal-2",
      nickname: "김민준",
      memberName: "김민준",
      amount: 8200,
      bank: "신한",
      accountNumber: "110234567890",
      accountHolder: "김민지",
      createdAt: hoursAgo(now, 26),
    },
    {
      id: "withdrawal-3",
      nickname: "한서윤",
      memberName: "한서윤",
      amount: 12000,
      bank: "토스뱅크",
      accountNumber: "100012345678",
      accountHolder: "한서윤",
      createdAt: hoursAgo(now, 3),
    },
    {
      id: "withdrawal-4",
      nickname: "박도현",
      memberName: "박도현",
      amount: 3000,
      bank: "카카오뱅크",
      accountNumber: "3333015678",
      accountHolder: "박도현",
      createdAt: hoursAgo(now, 80),
      review: { decision: "paid", memo: "", processedAt: hoursAgo(now, 50) },
    },
    {
      id: "withdrawal-5",
      nickname: "최유나",
      memberName: "최유나",
      amount: 2000,
      bank: "우리",
      accountNumber: "1002345670",
      accountHolder: "최유나",
      createdAt: hoursAgo(now, 120),
      review: { decision: "rejected", reason: "account", memo: "", processedAt: hoursAgo(now, 98) },
    },
  ];
}

/** 출금 요청 키 목록. 신고 키와 같은 이유로 목업에서 뽑아 둔다 */
export const WITHDRAWAL_KEYS = buildWithdrawals(new Date(0)).map((request) => request.id);

/** 처리 대기 2건과 이미 처리한 2건. 반려식물 일지는 테스트가 이미 시작돼 반려됐다 */
export function buildCancellations(now: Date): CancellationRequest[] {
  return [
    {
      id: "cancellation-1",
      recruitmentName: "레시피핏",
      recruitmentSlug: "recipefit",
      developerNickname: "박도현",
      reason: "서비스 출시 일정이 미뤄져서 테스트를 할 수 없어요",
      confirmedCount: 3,
      submittedFeedbackCount: 0,
      createdAt: hoursAgo(now, 40),
    },
    {
      id: "cancellation-2",
      recruitmentName: "동네 러닝 크루",
      recruitmentSlug: "run-crew",
      developerNickname: "최유나",
      reason: "모집 글에 테스트할 주소를 잘못 적었어요",
      confirmedCount: 0,
      submittedFeedbackCount: 0,
      createdAt: hoursAgo(now, 10),
    },
    {
      id: "cancellation-3",
      recruitmentName: "모아플랜",
      recruitmentSlug: "moaplan",
      developerNickname: "정하린",
      reason: "같은 기능을 다시 만들기로 했어요",
      confirmedCount: 2,
      submittedFeedbackCount: 0,
      createdAt: hoursAgo(now, 70),
      review: { decision: "approved", memo: "", processedAt: hoursAgo(now, 48) },
    },
    {
      id: "cancellation-4",
      recruitmentName: "반려식물 일지",
      recruitmentSlug: "plant-diary",
      developerNickname: "박도현",
      reason: "지원자가 적어서 다시 모집하고 싶어요",
      confirmedCount: 2,
      submittedFeedbackCount: 1,
      createdAt: hoursAgo(now, 120),
      review: { decision: "rejected", reason: "testing", memo: "", processedAt: hoursAgo(now, 96) },
    },
  ];
}

/** 모집 취소 요청 키 목록. 신고·출금 키와 같은 이유로 목업에서 뽑아 둔다 */
export const CANCELLATION_KEYS = buildCancellations(new Date(0)).map((request) => request.id);
