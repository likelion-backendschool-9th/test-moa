package com.testmoa.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * 리뷰 묶기(#107) 전용 스레드. 분석 서버 응답을 몇 분까지 기다려서 요청 스레드와 나눔.
     * 동시에 4건까지 분석하고 50건까지 줄을 세우며, 줄이 차면 시작하지 않고 503으로 알림.
     * 서버가 멈추면 진행 중이던 분석은 끝나지 않고, 다음 시작 때 FAILED가 됨(InterruptedAnalysisRecovery)
     */
    @Bean
    public TaskExecutor analysisTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("analysis-");
        return executor;
    }
}
