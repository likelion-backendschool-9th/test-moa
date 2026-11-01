/*
 * 회원 정보 형식 검사. 값을 받아 오류 문구를 돌려주고, 문제가 없으면 undefined를 돌려준다.
 * 중복 조회, 현재 비밀번호 확인, 쿠키 설정은 여기서 하지 않는다 (서버 액션에서 한다).
 */

export const NAME_MAX = 20;
const NICKNAME_PATTERN = /^[가-힣a-zA-Z0-9]{2,12}$/;
const PASSWORD_PATTERN = /^(?=.*[a-zA-Z])(?=.*\d).{8,64}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 닉네임 칸 아래 안내 문구 */
export const NICKNAME_HINT = "한글·영문·숫자 2~12자";
/** 비밀번호 칸 아래 안내 문구 */
export const PASSWORD_HINT = "영문과 숫자를 섞어 8자 이상";

/** 이름: 필수, 앞뒤 공백을 뺀 1~20자. 공백은 부르는 쪽에서 뺀다 */
export function validateName(name: string): string | undefined {
  if (!name) return "이름을 입력해 주세요";
  if (name.length > NAME_MAX) return `이름은 ${NAME_MAX}자까지 쓸 수 있어요`;
}

/** 닉네임: 필수, 한글·영문·숫자 */
export function validateNickname(nickname: string): string | undefined {
  if (!nickname) return "닉네임을 입력해 주세요";
  if (!NICKNAME_PATTERN.test(nickname)) return `닉네임은 ${NICKNAME_HINT}예요`;
}

/** 이메일: 필수, x@y.z 모양 */
export function validateEmail(email: string): string | undefined {
  if (!email) return "이메일을 입력해 주세요";
  if (!EMAIL_PATTERN.test(email)) return "이메일 형식이 맞지 않아요";
}

/** 새 비밀번호: 영문과 숫자를 모두 넣은 8~64자. 빈 칸 문구는 칸마다 달라 부르는 쪽에서 넘긴다 */
export function validateNewPassword(password: string, emptyMessage: string): string | undefined {
  if (!password) return emptyMessage;
  if (!PASSWORD_PATTERN.test(password)) return "영문과 숫자를 섞어 8자 이상 써 주세요";
}
