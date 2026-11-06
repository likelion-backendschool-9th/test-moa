package com.testmoa.backend.config;

import com.testmoa.backend.global.client.AnalysisClient;
import com.testmoa.backend.global.client.AnalysisProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;

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
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(properties.readTimeout());

        RestClient.Builder builder = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory);
        return new AnalysisClient(builder, properties.internalToken());
    }
}
