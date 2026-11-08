package com.testmoa.backend.service;

import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.enums.RecruitmentPhase;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class ChatReadOnlyPolicy {
    public boolean isClosed(Recruitment recruitment, LocalDateTime now) {
        var phase = recruitment.phaseAt(now);
        return phase == RecruitmentPhase.CLOSED || phase == RecruitmentPhase.CANCELLED;
    }

    public boolean isReadOnly(Recruitment recruitment, boolean developerActive, LocalDateTime now) {
        return isClosed(recruitment, now) || !developerActive;
    }
}
