package com.testmoa.backend.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * 실패 응답의 에러 코드. 응답의 error.code에는 이름(name)이 그대로 내려간다.
 * 기능별 코드(EMAIL_TAKEN 등)는 그 기능을 만들 때 여기에 더한다
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값을 확인해 주세요"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요해요"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "권한이 없어요"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "찾을 수 없어요"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "잠시 후 다시 시도해 주세요"),

    // 회원·인증. 문구는 프론트 화면 문구와 같다
    EMAIL_TAKEN(HttpStatus.CONFLICT, "이미 가입한 이메일이에요"),
    NICKNAME_TAKEN(HttpStatus.CONFLICT, "이미 쓰고 있는 닉네임이에요"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 맞지 않아요"),
    SUSPENDED(HttpStatus.FORBIDDEN, "이용이 정지된 계정이에요"),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "다시 로그인해 주세요"),

    // 소셜 로그인·계정 연동
    OAUTH_FAILED(HttpStatus.UNAUTHORIZED, "소셜 로그인에 실패했어요. 다시 시도해 주세요"),
    OAUTH_EMAIL_REQUIRED(HttpStatus.BAD_REQUEST, "확인된 이메일이 없는 계정이에요. 소셜 계정에서 이메일을 확인한 뒤 다시 시도해 주세요"),
    INVALID_SIGNUP_TOKEN(HttpStatus.UNAUTHORIZED, "가입 시간이 지났어요. 소셜 로그인을 다시 해 주세요"),
    ACCOUNT_ALREADY_LINKED(HttpStatus.CONFLICT, "다른 회원에 이미 연동된 소셜 계정이에요"),
    EMAIL_ACCOUNT_EXISTS(HttpStatus.CONFLICT, "이미 이메일로 가입한 계정이에요. 이메일로 로그인한 뒤 마이페이지에서 연동해 주세요"),
    PROVIDER_ALREADY_LINKED(HttpStatus.CONFLICT, "이미 같은 서비스의 다른 계정이 연동돼 있어요"),
    LAST_LOGIN_METHOD(HttpStatus.CONFLICT, "마지막 로그인 방법은 해제할 수 없어요"),

    // 회원 신고
    REPORT_SELF(HttpStatus.BAD_REQUEST, "자기 자신은 신고할 수 없어요"),
    REPORT_DUPLICATED(HttpStatus.CONFLICT, "이미 신고해서 검토를 기다리고 있어요"),
    REPORT_ALREADY_REVIEWED(HttpStatus.CONFLICT, "이미 처리한 신고예요"),

    // 채팅
    CHAT_READ_ONLY(HttpStatus.FORBIDDEN, "대화가 끝난 방이라 메시지를 보낼 수 없어요"),

    // 구독
    SUBSCRIPTION_REQUIRED(HttpStatus.FORBIDDEN, "구독한 회원만 쓸 수 있어요"),
    DUPLICATE_PAYMENT(HttpStatus.CONFLICT, "방금 결제했어요. 잠시 후 다시 시도해 주세요"),
    INSUFFICIENT_CREDIT(HttpStatus.CONFLICT, "쓸 수 있는 크레딧이 부족해요"),

    // 모집
    RECRUITMENT_NOT_CANCELLABLE(HttpStatus.CONFLICT, "지금은 모집을 취소할 수 없어요"),
    RECRUITMENT_NOT_EDITABLE(HttpStatus.CONFLICT, "종료되거나 취소된 모집은 바꿀 수 없어요"),
    FEEDBACK_NOT_REPORTABLE(HttpStatus.CONFLICT, "신고는 제출 후 72시간 안에만 할 수 있어요"),
    APPLICANTS_NOT_SELECTABLE(HttpStatus.CONFLICT, "선발형 구독 모집의 모집 기간에만 지원자를 확정·거절할 수 있어요"),
    RECRUITMENT_CLOSED(HttpStatus.CONFLICT, "모집이 마감됐어요"),
    ALREADY_APPLIED(HttpStatus.CONFLICT, "이미 지원한 테스트예요"),
    OWN_RECRUITMENT(HttpStatus.CONFLICT, "내 모집에는 지원할 수 없어요"),
    PARTICIPATION_NOT_CONFIRMED(HttpStatus.CONFLICT, "참여가 확정된 테스트만 피드백을 낼 수 있어요"),
    FEEDBACK_DEADLINE_PASSED(HttpStatus.CONFLICT, "피드백 제출 기한이 지났어요"),
    FEEDBACK_ALREADY_SUBMITTED(HttpStatus.CONFLICT, "이미 피드백을 제출했어요"),

    // 출금
    CASHOUT_ALREADY_PROCESSED(HttpStatus.CONFLICT, "이미 처리한 출금 요청이에요"),

    // AI 분석
    AI_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "AI 분석을 잠시 쓸 수 없어요. 잠시 후 다시 시도해 주세요"),
    FOLLOWUP_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "오늘 쓸 수 있는 질문 추천을 모두 썼어요. 내일 다시 써 주세요"),

    // AI 리뷰 묶기
    NO_FEEDBACKS(HttpStatus.CONFLICT, "분석할 리뷰가 없어요"),
    ANALYSIS_IN_PROGRESS(HttpStatus.CONFLICT, "리뷰 분석이 진행 중이에요. 끝나면 다시 시도해 주세요"),
    ANALYSIS_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "이번 주에 쓸 수 있는 리뷰 분석을 모두 썼어요. 다음 주에 다시 써 주세요"),

    // GitHub 이슈 등록
    ISSUE_ALREADY_REGISTERED(HttpStatus.CONFLICT, "이미 등록했거나 등록 중인 이슈예요"),
    GITHUB_REPO_NOT_LINKED(HttpStatus.CONFLICT, "프로젝트에 GitHub 레포가 연결되지 않았어요"),
    GITHUB_AUTH_REQUIRED(HttpStatus.FAILED_DEPENDENCY, "GitHub 연결을 다시 해 주세요"),
    GITHUB_REPO_UNAVAILABLE(HttpStatus.FAILED_DEPENDENCY, "GitHub 레포를 찾을 수 없거나 이슈를 만들 권한이 없어요. 레포 연결을 확인해 주세요"),
    GITHUB_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "GitHub에 잠시 이슈를 등록할 수 없어요. 잠시 후 다시 시도해 주세요"),

    // AI 버전 비교
    NO_PREVIOUS_VERSION(HttpStatus.CONFLICT, "비교할 이전 버전이 없어요"),
    ANALYSIS_NOT_DONE(HttpStatus.CONFLICT, "두 버전의 리뷰 분석을 먼저 해 주세요"),
    COMPARISON_NOT_FOUND(HttpStatus.NOT_FOUND, "아직 버전 비교를 하지 않았어요"),
    COMPARISON_LIMIT_EXCEEDED(HttpStatus.TOO_MANY_REQUESTS, "이번 주에 쓸 수 있는 버전 비교를 모두 썼어요. 다음 주에 다시 써 주세요");

    private final HttpStatus status;
    private final String message;
}
