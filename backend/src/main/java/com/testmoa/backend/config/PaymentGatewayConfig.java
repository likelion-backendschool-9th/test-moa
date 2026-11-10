package com.testmoa.backend.config;

import com.testmoa.backend.global.client.pg.PaymentProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/** 구독 현금 결제(PG) 설정을 읽는다. 게이트웨이 클래스는 컴포넌트 스캔으로 등록된다 */
@Configuration
@EnableConfigurationProperties(PaymentProperties.class)
public class PaymentGatewayConfig {
}
