package com.testmoa.backend.global.client;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * AI 분석 서버 연결 설정(application.yml의 analysis.*)
 *
 * @param baseUrl        분석 서버 주소
 * @param internalToken  X-Internal-Token으로 보내는 내부 토큰. 비어 있으면 분석 서버를 부르지 않음
 * @param connectTimeout 연결 대기 시간
 * @param readTimeout    응답 대기 시간
 * @param reviewAnalysisReadTimeout 리뷰 묶기(/v1/analyses)의 응답 대기 시간. 비동기로 불러 길게 둠
 * @param weeklyLimitEnabled        리뷰 묶기·버전 비교의 개발자별 주 3회 한도를 셀지. false면 횟수 제한이 없음
 */
@ConfigurationProperties("analysis")
public record AnalysisProperties(
        String baseUrl,
        String internalToken,
        Duration connectTimeout,
        Duration readTimeout,
        Duration reviewAnalysisReadTimeout,
        boolean weeklyLimitEnabled
) {}
