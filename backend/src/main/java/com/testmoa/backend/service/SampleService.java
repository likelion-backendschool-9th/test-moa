package com.testmoa.backend.service;

import com.testmoa.backend.domain.dto.request.SampleSaveRequest;
import com.testmoa.backend.domain.dto.response.SampleResponse;

import java.util.List;

public interface SampleService {
    SampleResponse create(SampleSaveRequest request);
    SampleResponse findById(Long sampleId);
    List<SampleResponse> findAll();
    SampleResponse update(Long sampleId, SampleSaveRequest request);
    void delete(Long sampleId);
}
