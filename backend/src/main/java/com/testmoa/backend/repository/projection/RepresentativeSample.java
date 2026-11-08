package com.testmoa.backend.repository.projection;

/** 분석 그룹의 대표 리뷰 내용. 버전 비교 요청의 sample로 보낸다. */
public record RepresentativeSample(Long groupId, String content) {}
