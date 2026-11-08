package com.testmoa.backend.service;

import com.testmoa.backend.entity.enums.RecruitmentPhase;
import com.testmoa.backend.entity.enums.RegisterStatus;
import com.testmoa.backend.entity.enums.SelectionMode;
import com.testmoa.backend.entity.enums.TypeCode;

/**
 * 모집글 값을 응답에 쓰는 프론트 이름으로 바꾸기만 한다. 내 프로젝트(#92)와 공개 모집(#113)이 같이 쓴다.
 * 진행 단계를 마감일로 계산하는 일은 Recruitment.phaseAt이 한다
 */
public final class RecruitmentNames {
    private RecruitmentNames() {}

    /** 진행 단계(recruiting, testing, closed, cancelled). 프론트 상태 이름과 같다 */
    public static String phase(RecruitmentPhase phase) {
        return phase.name().toLowerCase();
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
