import type { Role } from "@/lib/session";
import type { ChatMessage, ChatRoom } from "./types";

/*
 * 시연용 샘플 데이터. 실제 서비스나 사용자와 관계없다.
 * 윤슬(tester)·도현랩(developer)은 마이페이지 목업의 닉네임이고, 나머지 닉네임은 시연용으로 정했다.
 * 시각은 기준 시각에서 거꾸로 계산해 언제 시연해도 같은 순서로 보인다.
 */

const MINUTE_MS = 60 * 1000;
const DAY_MINUTES = 24 * 60;

/** 저장된 메시지 한 건. 요청자는 프로젝트 주인(개발자), 응답자는 선정된 테스터다 */
type SeedMessage = {
  from: "requester" | "responder";
  text: string;
  minutesAgo: number;
};

/** 저장된 채팅방 한 건. 메시지는 오래된 것부터이고, 마지막 메시지가 채팅함 카드의 미리보기가 된다 */
type Seed = {
  roomKey: string;
  recruitmentSlug: string;
  projectName: string;
  requester: string;
  responder: string;
  messages: SeedMessage[];
};

const ROOMS: Seed[] = [
  {
    roomKey: "booklog-yunseul",
    recruitmentSlug: "booklog",
    projectName: "북로그",
    requester: "서재지기",
    responder: "윤슬",
    messages: [
      {
        from: "requester",
        text: "윤슬님, 북로그 테스트에 선정되신 걸 축하드려요. 테스트 기간 동안 궁금한 건 여기서 편하게 물어봐 주세요.",
        minutesAgo: 3 * DAY_MINUTES + 30,
      },
      { from: "responder", text: "감사합니다! 오늘 저녁에 설치해서 써 볼게요.", minutesAgo: 3 * DAY_MINUTES + 12 },
      { from: "responder", text: "독서 기록에 사진을 여러 장 올리면 순서가 바뀌는 것 같아요.", minutesAgo: 2 * DAY_MINUTES + 200 },
      {
        from: "requester",
        text: "확인해 보니 사진을 한 번에 여러 장 올릴 때 생기는 문제였어요.",
        minutesAgo: 2 * DAY_MINUTES + 170,
      },
      { from: "requester", text: "이번 주 업데이트에서 고칠게요.", minutesAgo: 2 * DAY_MINUTES + 170 },
      { from: "responder", text: "업데이트하고 나니 사진 순서가 그대로 잘 나와요.", minutesAgo: 25 },
      { from: "requester", text: "피드백 마감이 이틀 남았어요. 막히는 부분 있으면 편하게 물어봐 주세요.", minutesAgo: 1 },
    ],
  },
  {
    roomKey: "moaplan-yunseul",
    recruitmentSlug: "moaplan",
    projectName: "모아플랜",
    requester: "모아메이커",
    responder: "윤슬",
    messages: [
      {
        from: "responder",
        text: "모아플랜 테스트에 지원한 윤슬이에요. 평일에는 시간이 없어서 주말에 몰아서 해도 될까요?",
        minutesAgo: DAY_MINUTES + 40,
      },
      { from: "requester", text: "네, 주말에 하셔도 괜찮아요.", minutesAgo: DAY_MINUTES + 5 },
      {
        from: "requester",
        text: "참여 확정됐어요. 접속 링크로 들어가서 일정 만들기부터 해 보시면 돼요.",
        minutesAgo: DAY_MINUTES,
      },
    ],
  },
  {
    roomKey: "recipefit-yunseul",
    recruitmentSlug: "recipefit",
    projectName: "레시피핏",
    requester: "냉장고셰프",
    responder: "윤슬",
    messages: [
      {
        from: "requester",
        text: "레시피핏 테스트에 참여해 주셔서 감사해요. 냉장고 재료를 세 가지 이상 넣고 추천을 받아 보세요.",
        minutesAgo: 6 * DAY_MINUTES,
      },
      { from: "responder", text: "재료를 다섯 가지 넣었는데 추천이 한 가지 요리만 나와요.", minutesAgo: 5 * DAY_MINUTES + 100 },
      { from: "responder", text: "두부랑 김치를 넣으면 찌개만 계속 나와요.", minutesAgo: 5 * DAY_MINUTES + 100 },
      {
        from: "requester",
        text: "추천 결과에 남겨 주신 의견 반영해서 다음 주에 업데이트할게요.",
        minutesAgo: 2 * DAY_MINUTES,
      },
    ],
  },
  {
    roomKey: "ledger-yunseul",
    recruitmentSlug: "ledger-note",
    projectName: "가계부 노트",
    requester: "도현랩",
    responder: "윤슬",
    messages: [
      {
        from: "requester",
        text: "가계부 노트 테스트에 선정되셨어요. 일주일 동안 지출을 기록해 보시고 자동 분류가 맞는지 봐 주세요.",
        minutesAgo: 7 * DAY_MINUTES,
      },
      {
        from: "responder",
        text: "카페 결제가 '교통'으로 분류돼요. 화면은 피드백에 같이 올렸어요.",
        minutesAgo: 4 * DAY_MINUTES + 90,
      },
      { from: "requester", text: "보내 주신 분류 오류 확인했어요. 다음 버전에서 고칠게요.", minutesAgo: 4 * DAY_MINUTES },
    ],
  },
  {
    roomKey: "meeting-yunseul",
    recruitmentSlug: "meeting-notes",
    projectName: "회의록 정리",
    requester: "도현랩",
    responder: "윤슬",
    messages: [
      {
        from: "requester",
        text: "회의록 정리 테스트에 선정되셨어요. 회의 녹음을 올리면 요약이 만들어져요.",
        minutesAgo: 12 * DAY_MINUTES,
      },
      { from: "responder", text: "녹음을 올렸는데 요약이 아직 안 나와요.", minutesAgo: 10 * DAY_MINUTES },
      {
        from: "requester",
        text: "어제 서버를 점검하느라 요약이 늦었어요. 지금은 바로 나와요.",
        minutesAgo: 9 * DAY_MINUTES + 30,
      },
      { from: "requester", text: "요약 기능 써 보셨나요? 불편한 점 있으면 알려 주세요.", minutesAgo: 9 * DAY_MINUTES },
    ],
  },
  {
    roomKey: "ledger-saebyeok",
    recruitmentSlug: "ledger-note",
    projectName: "가계부 노트",
    requester: "도현랩",
    responder: "새벽코더",
    messages: [
      { from: "requester", text: "새벽코더님, 영수증 인식 위주로 봐 주시면 좋겠어요.", minutesAgo: DAY_MINUTES + 300 },
      { from: "responder", text: "편의점 영수증은 금액까지 잘 읽혀요.", minutesAgo: 7 },
      { from: "responder", text: "영수증 사진이 흐리면 금액을 못 읽는 것 같아요.", minutesAgo: 5 },
    ],
  },
  {
    roomKey: "booklog-dohyeon",
    recruitmentSlug: "booklog",
    projectName: "북로그",
    requester: "서재지기",
    responder: "도현랩",
    messages: [
      { from: "responder", text: "북로그 피드백 제출했어요. 검색 결과 정렬 위주로 적었어요.", minutesAgo: 6 * DAY_MINUTES + 120 },
      { from: "requester", text: "피드백 잘 받았어요. 참여해 주셔서 감사해요.", minutesAgo: 6 * DAY_MINUTES },
    ],
  },
];

/** 시연용 프로젝트 화면 이미지(public/sample/projects). 웹 서비스는 브라우저 창, 앱은 휴대폰 화면 모양이며 실제 서비스 화면이 아니다 */
const PROJECT_IMAGES: Record<string, string> = {
  booklog: "/sample/projects/booklog.svg",
  moaplan: "/sample/projects/moaplan.svg",
  recipefit: "/sample/projects/recipefit.svg",
  "ledger-note": "/sample/projects/ledger-note.svg",
  "meeting-notes": "/sample/projects/meeting-notes.svg",
};

/** 시연용 회원의 닉네임. 운영자는 서비스 이용 회원이 아니라서 채팅방이 없다 */
const MEMBER_NICKNAME: Record<Exclude<Role, "guest">, string | null> = {
  tester: "윤슬",
  developer: "도현랩",
  admin: null,
};

export type ChatThreadSeed = { room: ChatRoom; messages: ChatMessage[] };

/**
 * 회원이 요청자나 응답자로 들어가 있는 채팅방과 대화 기록을, 회원 기준(나의 역할, 대화 상대, 나·상대)으로 바꿔 돌려준다.
 * 시각은 기준 시각에서 거꾸로 계산한다. anchors에 방별 기준 시각(그 방에서 처음 보낸 메시지 시각)이 있으면
 * 그 시각에서 계산해, 시간이 지나도 목업 메시지가 회원이 보낸 메시지 뒤로 넘어가지 않게 한다.
 */
export function buildChatThreads(
  role: Exclude<Role, "guest">,
  now: Date,
  anchors: Record<string, string> = {},
): ChatThreadSeed[] {
  const nickname = MEMBER_NICKNAME[role];
  if (!nickname) return [];
  return ROOMS.filter((room) => room.requester === nickname || room.responder === nickname).map(
    ({ requester, responder, messages: seeds, ...room }) => {
      const isDeveloper = requester === nickname;
      const mine = isDeveloper ? "requester" : "responder";
      const anchor = anchors[room.roomKey] ? Date.parse(anchors[room.roomKey]) : Number.NaN;
      const base = Number.isNaN(anchor) ? now.getTime() : Math.min(now.getTime(), anchor);
      const messages = seeds.map(
        (seed, index): ChatMessage => ({
          id: `${room.roomKey}-${index + 1}`,
          from: seed.from === mine ? "me" : "partner",
          text: seed.text,
          sentAt: new Date(base - seed.minutesAgo * MINUTE_MS).toISOString(),
        }),
      );
      const last = messages[messages.length - 1];
      return {
        room: {
          ...room,
          projectImage: PROJECT_IMAGES[room.recruitmentSlug],
          myRole: isDeveloper ? "developer" : "tester",
          partner: isDeveloper ? { nickname: responder, role: "tester" } : { nickname: requester, role: "developer" },
          lastMessage: last.text,
          lastMessageAt: last.sentAt,
        },
        messages,
      };
    },
  );
}
