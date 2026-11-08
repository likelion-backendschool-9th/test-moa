package com.testmoa.backend.config;

import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
@EnableConfigurationProperties(AnalysisProperties.class)
public class AnalysisClientConfig {

    @Bean
    public AnalysisClient analysisClient(AnalysisProperties properties) {
        // 분석 서버(uvicorn)는 HTTP/2를 받지 않아 HTTP/1.1로 부름
        HttpClient httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(properties.connectTimeout())
                .build();

        RestClient.Builder builder = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory(httpClient, properties.readTimeout()));
        // 리뷰 묶기만 응답 대기 시간을 길게 둠. 연결 설정은 같음
        RestClient.Builder reviewAnalysisBuilder = builder.clone()
                .requestFactory(requestFactory(httpClient, properties.reviewAnalysisReadTimeout()));
        return new AnalysisClient(builder, reviewAnalysisBuilder, properties.internalToken());
    }

    private static JdkClientHttpRequestFactory requestFactory(HttpClient httpClient, Duration readTimeout) {
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(readTimeout);
        return requestFactory;
    }
}
