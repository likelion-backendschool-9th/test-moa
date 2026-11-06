package com.testmoa.backend.service;

import com.testmoa.backend.entity.Recruitment;
import com.testmoa.backend.entity.enums.RecruitmentStatus;
import com.testmoa.backend.entity.enums.RegisterStatus;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.TypeCode;

import java.time.LocalDateTime;

/**
 * 모집글 값을 응답에 쓰는 프론트 이름으로 바꾼다. 내 프로젝트(#92)와 공개 모집(#113)이 같이 쓴다
 */
public final class RecruitmentNames {
    private RecruitmentNames() {}

    /**
     * 모집 상태(recruiting, testing, closed, cancelled). 취소만 저장된 값을 쓰고, 나머지는 마감일로 계산한다(README 정한 것 11)
     *
     * @param now 서버 시간대의 지금(LocalDateTime.now())
     */
    public static String status(Recruitment recruitment, LocalDateTime now) {
        if (recruitment.getStatus() == RecruitmentStatus.CANCELLED) return "cancelled";
        if (now.isBefore(recruitment.getRecruitDeadline())) return "recruiting";
        return now.isBefore(recruitment.getFeedbackDeadline()) ? "testing" : "closed";
    }

    /** 선정 방식. FIRST_COME → firstCome, MANUAL → selection */
    public static String selectionMode(SelectionMode selectionMode) {
        return selectionMode == SelectionMode.MANUAL ? "selection" : "firstCome";
    }

    /** 유형. WEB → web. 유형이 없으면 null */
    public static String softwareType(TypeCode code) {
        return code == null ? null : code.name().toLowerCase();
    }

    /** 참가 상태. 프론트 ApplicationStatus와 같은 이름(applied, confirmed, rejected, cancelled) */
    public static String registerStatus(RegisterStatus status) {
        return status == null ? null : status.name().toLowerCase();
    }
}
