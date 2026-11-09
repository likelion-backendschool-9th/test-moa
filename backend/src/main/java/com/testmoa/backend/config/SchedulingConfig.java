package com.testmoa.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** 앱 전체의 @Scheduled를 켠다. */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
