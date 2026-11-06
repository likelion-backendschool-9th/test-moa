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
 */
@ConfigurationProperties("analysis")
public record AnalysisProperties(
        String baseUrl,
        String internalToken,
        Duration connectTimeout,
        Duration readTimeout
) {}
