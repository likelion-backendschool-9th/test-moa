package com.testmoa.backend.domain.dto.request;

import com.testmoa.backend.global.common.ChatInboxSort;
import com.testmoa.backend.global.common.ChatRole;

public record ChatInboxQuery(String q, ChatRole role, ChatInboxSort sort) {
    public ChatInboxQuery {
        q = q == null ? "" : q.strip();
        sort = sort == null ? ChatInboxSort.LATEST : sort;
    }
}
