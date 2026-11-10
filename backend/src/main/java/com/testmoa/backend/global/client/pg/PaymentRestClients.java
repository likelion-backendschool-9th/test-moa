package com.testmoa.backend.global.client.pg;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Duration;

/** 결제 대행사를 부르는 RestClient. 연결 5초, 응답 15초까지만 기다린다 */
final class PaymentRestClients {

    private PaymentRestClients() {
    }

    static RestClient build(String baseUrl) {
        HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(15));
        return RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
    }
}
