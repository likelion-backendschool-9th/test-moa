package com.testmoa.backend.dto.request;

import com.testmoa.backend.entity.enums.ChatInboxSort;
import com.testmoa.backend.entity.enums.ChatRole;

public record ChatInboxQuery(String q, ChatRole role, ChatInboxSort sort) {
    public ChatInboxQuery {
        q = q == null ? "" : q.strip();
        sort = sort == null ? ChatInboxSort.LATEST : sort;
    }
}
