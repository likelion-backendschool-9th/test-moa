package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.response.MySanctionResponse;
import com.testmoa.backend.repository.SanctionRepository;
import com.testmoa.backend.service.SanctionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SanctionServiceImpl implements SanctionService {
    private final SanctionRepository sanctionRepository;

    @Override
    public List<MySanctionResponse> getMine(Long userId) {
        LocalDateTime now = LocalDateTime.now();
        return sanctionRepository.findByUserIdOrderByStartedAtDescIdDesc(userId).stream()
                .map(sanction -> MySanctionResponse.of(sanction, now)).toList();
    }
}
