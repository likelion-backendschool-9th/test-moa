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
     * 동시에 4건까지 분석하고 10건까지 줄을 세우며, 줄이 차면 시작하지 않고 503으로 알림.
     * 건당 최대 5분이라 줄 끝은 최악 약 20분 기다림. 줄을 길게 두면 그만큼 오래 PENDING으로 남아 짧게 둠.
     * 서버가 멈출 때(배포) 진행 중인 분석을 잠깐 기다려 거의 끝난 분석은 저장까지 마침. 컨테이너는 종료 신호 10초 뒤
     * 강제로 끝나므로(docker stop 기본값) 그 안에서 끝나게 8초만 기다림. 못 끝낸 분석은 다음 시작 때 FAILED가 됨(InterruptedAnalysisRecovery)
     */
    @Bean
    public TaskExecutor analysisTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(10);
        executor.setThreadNamePrefix("analysis-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(8);
        return executor;
    }
}
