package com.testmoa.backend.repository.projection;

/** 버전 비교의 짝 하나. 이번 버전 그룹 id와 이어진 직전 버전 그룹 id */
public record LinkPair(Long currentGroupId, Long previousGroupId) {}
