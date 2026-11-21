package com.testmoa.backend.dto.response;

import java.util.List;

/** 검색어가 들어간 메시지의 순번. 최신 메시지부터이고, 다 주지 못했으면 hasMore가 true다 */
public record ChatMessageSearchResponse(List<Long> seqs, boolean hasMore) {}
