import type { CancellationRequest, Report, WithdrawalRequest } from "./types";

/*
 * 시연용 샘플 데이터. 실제 서비스나 사용자와 관계없다.
 * 모집 건 이름은 모집 목업을 재사용하고, 시각은 기준 시각에서 몇 시간 전으로 만든다.
 * 그래서 언제 열어도 같은 신고에 "72시간 지남"이 붙는다.
 */

const HOUR_MS = 60 * 60 * 1000;
const hoursAgo = (now: Date, hours: number) => new Date(now.getTime() - hours * HOUR_MS).toISOString();

export function buildReports(now: Date): Report[] {
  return [
    {
      id: "report-1",
      targetType: "feedback",
      recruitmentName: "회의록 정리",
      reason: "요청한 기능을 써 보지 않고 제출했어요",
      createdAt: hoursAgo(now, 80),
      holdsReward: true,
    },
    {
      id: "report-2",
      targetType: "feedback",
      recruitmentName: "북로그",
      reason: "같은 문장을 반복한 피드백이에요",
      createdAt: hoursAgo(now, 30),
      holdsReward: true,
    },
    {
      id: "report-3",
      targetType: "recruitment",
      recruitmentName: "포트폴리오 빌더",
      reason: "모집 글과 실제 서비스 내용이 달라요",
      createdAt: hoursAgo(now, 50),
      holdsReward: false,
    },
    {
      id: "report-4",
      targetType: "user",
      recruitmentName: "가계부 노트",
      reason: "채팅에서 부적절한 표현을 썼어요",
      createdAt: hoursAgo(now, 6),
      holdsReward: false,
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
