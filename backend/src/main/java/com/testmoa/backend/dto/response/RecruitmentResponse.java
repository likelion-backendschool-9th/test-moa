package com.testmoa.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 공개 모집글 상세. 접속 링크는 참여가 확정된 테스터에게만 안내하므로 넣지 않는다.
 * status·selectionMode·softwareType·myRegisterStatus는 프론트 이름이다
 *
 * @param subscription      구독 모집 여부. 추가 보상 표시에 쓴다
 * @param imageUrls         모집글 이미지. 보낸 순서대로. 프로젝트 대표 이미지는 project.imageUrl
 * @param myRegisterStatus  로그인한 회원의 가장 최근 참가 상태. 참가가 없거나 비로그인이면 null
 */
public record RecruitmentResponse(
        Long id,
        String title,
        String description,
        String conditions,
        String status,
        String selectionMode,
        String softwareType,
        List<String> softwareTypes,
        boolean subscription,
        LocalDateTime recruitDeadline,
        LocalDateTime submitDeadline,
        ProjectInfo project,
        List<String> imageUrls,
        List<TestItemInfo> testItems,
        String myRegisterStatus
) {
    /** 모집글을 올린 프로젝트 */
    public record ProjectInfo(Long id, String name, String description, String imageUrl, String ownerNickname) {}

    /** 테스트 항목 하나. 이미지는 보낸 순서대로, 없으면 빈 배열 */
    public record TestItemInfo(Long id, String title, String description, boolean required, List<String> imageUrls) {}
}
