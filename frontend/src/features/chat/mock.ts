import type { Role } from "@/lib/session";
import type { ChatRoom } from "./types";

/*
 * 시연용 샘플 데이터. 실제 서비스나 사용자와 관계없다.
 * 윤슬(tester)·도현랩(developer)은 마이페이지 목업의 닉네임이고, 나머지 닉네임은 시연용으로 정했다.
 * 일시는 기준 시각에서 거꾸로 계산해 언제 시연해도 같은 순서로 보인다.
 */

const MINUTE_MS = 60 * 1000;
const DAY_MINUTES = 24 * 60;

type Seed = Omit<ChatRoom, "lastMessageAt"> & { minutesAgo: number };

const ROOMS: Seed[] = [
  {
    roomKey: "booklog-yunseul",
    recruitmentSlug: "booklog",
    projectName: "북로그",
    requester: "서재지기",
    responder: "윤슬",
    lastMessage: "피드백 마감이 이틀 남았어요. 막히는 부분 있으면 편하게 물어봐 주세요.",
    minutesAgo: 1,
  },
  {
    roomKey: "moaplan-yunseul",
    recruitmentSlug: "moaplan",
    projectName: "모아플랜",
    requester: "모아메이커",
    responder: "윤슬",
    lastMessage: "참여 확정됐어요. 접속 링크로 들어가서 일정 만들기부터 해 보시면 돼요.",
    minutesAgo: DAY_MINUTES,
  },
  {
    roomKey: "recipefit-yunseul",
    recruitmentSlug: "recipefit",
    projectName: "레시피핏",
    requester: "냉장고셰프",
    responder: "윤슬",
    lastMessage: "추천 결과에 남겨 주신 의견 반영해서 다음 주에 업데이트할게요.",
    minutesAgo: 2 * DAY_MINUTES,
  },
  {
    roomKey: "ledger-yunseul",
    recruitmentSlug: "ledger-note",
    projectName: "가계부 노트",
    requester: "도현랩",
    responder: "윤슬",
    lastMessage: "보내 주신 분류 오류 확인했어요. 다음 버전에서 고칠게요.",
    minutesAgo: 4 * DAY_MINUTES,
  },
  {
    roomKey: "meeting-yunseul",
    recruitmentSlug: "meeting-notes",
    projectName: "회의록 정리",
    requester: "도현랩",
    responder: "윤슬",
    lastMessage: "요약 기능 써 보셨나요? 불편한 점 있으면 알려 주세요.",
    minutesAgo: 9 * DAY_MINUTES,
  },
  {
    roomKey: "ledger-saebyeok",
    recruitmentSlug: "ledger-note",
    projectName: "가계부 노트",
    requester: "도현랩",
    responder: "새벽코더",
    lastMessage: "영수증 사진이 흐리면 금액을 못 읽는 것 같아요.",
    minutesAgo: 5,
  },
  {
    roomKey: "booklog-dohyeon",
    recruitmentSlug: "booklog",
    projectName: "북로그",
    requester: "서재지기",
    responder: "도현랩",
    lastMessage: "피드백 잘 받았어요. 참여해 주셔서 감사해요.",
    minutesAgo: 6 * DAY_MINUTES,
  },
];

/** 시연용 회원의 닉네임. 운영자는 서비스 이용 회원이 아니라서 채팅방이 없다 */
const MEMBER_NICKNAME: Record<Exclude<Role, "guest">, string | null> = {
  tester: "윤슬",
  developer: "도현랩",
  admin: null,
};

/** 회원이 요청자나 응답자로 들어가 있는 채팅방 */
export function buildChatRooms(role: Exclude<Role, "guest">, now: Date): ChatRoom[] {
  const nickname = MEMBER_NICKNAME[role];
  if (!nickname) return [];
  return ROOMS.filter((room) => room.requester === nickname || room.responder === nickname).map(({ minutesAgo, ...room }) => ({
    ...room,
    lastMessageAt: new Date(now.getTime() - minutesAgo * MINUTE_MS).toISOString(),
  }));
}
