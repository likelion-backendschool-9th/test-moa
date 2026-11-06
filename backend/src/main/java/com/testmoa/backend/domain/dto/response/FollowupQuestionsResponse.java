package com.testmoa.backend.domain.dto.response;

import java.util.List;

/**
 * AI 후속 질문 추천 결과. 개발자가 복사해 채팅으로 테스터에게 보냄
 *
 * @param questions 추천 질문. 개수와 문장은 분석 서버가 정함(3개)
 */
public record FollowupQuestionsResponse(List<String> questions) {}
