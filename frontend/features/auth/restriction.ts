import { formatDate } from "@/lib/format";

/** 백엔드 403 RESTRICTED의 error.fields(#86). 영구 정지는 endsAt이 없다 */
export type RestrictionFields = { reason?: string; endsAt?: string };

/**
 * 운영자 제재 안내 문구. "운영자 제재로 12월 3일까지 로그인할 수 없어요. 사유: 욕설".
 * action은 막힌 일을 "~할" 꼴로 받는다(로그인할, 지원할, 채팅할). 사유가 없으면 사유 문장을 뺀다
 */
export function restrictionNotice(fields: RestrictionFields | undefined, action = "로그인할") {
  const until = fields?.endsAt ? `${formatDate(fields.endsAt)}까지 ` : "";
  const reason = fields?.reason ? ` 사유: ${fields.reason}` : "";
  return `운영자 제재로 ${until}${action} 수 없어요.${reason}`;
}
