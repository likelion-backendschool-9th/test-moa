package com.testmoa.backend.service;

import com.testmoa.backend.domain.dto.response.MeResponse;

public interface UserService {
    MeResponse getMe(Long userId);
}
