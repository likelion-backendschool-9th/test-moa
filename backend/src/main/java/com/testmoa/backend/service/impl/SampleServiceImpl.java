package com.testmoa.backend.service.impl;

import com.testmoa.backend.domain.dto.request.SampleSaveRequest;
import com.testmoa.backend.domain.dto.response.SampleResponse;
import com.testmoa.backend.domain.entity.Sample;
import com.testmoa.backend.domain.repository.SampleRepository;
import com.testmoa.backend.service.SampleService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;

@Service
@Transactional
public class SampleServiceImpl implements SampleService {

    private final SampleRepository sampleRepository;

    public SampleServiceImpl(SampleRepository sampleRepository) {
        this.sampleRepository = sampleRepository;
    }

    /**
     * 예시 데이터 생성 메소드
     */
    @Override
    public SampleResponse create(SampleSaveRequest request) {
        Sample sample = sampleRepository.save(request.toEntity());

        SampleResponse response = SampleResponse.of(sample);

        return response;
    }

    /**
     * 예시 데이터 단건 조회 메소드
     */
    @Override
    public SampleResponse findById(Long sampleId) {
        Sample sample = sampleRepository.findById(sampleId).orElseThrow();

        SampleResponse response = SampleResponse.of(sample);

        return response;
    }

    /**
     * 예시 데이터 전체 조회 후 리스트로 반환
     */
    @Override
    public List<SampleResponse> findAll() {

        return sampleRepository.findAll().stream()
                .map(SampleResponse::of)
                .toList();
    }

    /**
     * 예시 데이터 수정 메소드
     */
    @Override
    public SampleResponse update(Long sampleId, SampleSaveRequest request) {
        Sample sample = sampleRepository.findById(sampleId).orElseThrow();

        // null 값이 아닌 것만 수정
        takeActionIfPresent(request.getTemp1(), sample::updateTemp1);
        takeActionIfPresent(request.getTemp2(), sample::updateTemp2);

        // 수정 일시(updatedAt)는 DB 반영 시점에 기록되므로, 응답에 담기 전에 먼저 반영
        sampleRepository.flush();

        SampleResponse response = SampleResponse.of(sample);

        return response;
    }

    // 모든 타입(Object)용 전역 유틸 메소드 (Null만 체크)
    private <T> void takeActionIfPresent(T value, Consumer<T> action){
        Optional.ofNullable(value)
                .ifPresent(action);
    }

    /**
     * 예시 데이터 삭제 메소드
     */
    @Override
    public void delete(Long sampleId) {
        sampleRepository.deleteById(sampleId);
    }
}
