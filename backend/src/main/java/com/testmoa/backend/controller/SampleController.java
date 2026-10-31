package com.testmoa.backend.controller;

import com.testmoa.backend.domain.dto.request.SampleSaveRequest;
import com.testmoa.backend.domain.dto.response.SampleResponse;
import com.testmoa.backend.global.common.ApiResponse;
import com.testmoa.backend.service.SampleService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/samples")
public class SampleController {
    private final SampleService sampleService;

    public SampleController(SampleService sampleService) {
        this.sampleService = sampleService;
    }

    @Operation(summary = "예시 데이터 생성")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SampleResponse> create(@RequestBody SampleSaveRequest request){
        SampleResponse response = sampleService.create(request);

        return ApiResponse.ok(response);
    }

    @Operation(summary = "예시 데이터 단건 조회")
    @GetMapping("/{sampleId}")
    public ApiResponse<SampleResponse> getSample(@PathVariable Long sampleId){
        SampleResponse response = sampleService.findById(sampleId);

        return ApiResponse.ok(response);
    }

    @Operation(summary = "예시 데이터 전체 조회")
    @GetMapping
    public ApiResponse<List<SampleResponse>> getSamples(){
        List<SampleResponse> responses = sampleService.findAll();

        return ApiResponse.ok(responses);
    }

    @Operation(summary = "예시 데이터 수정")
    @PutMapping("/{sampleId}")
    public ApiResponse<SampleResponse> update(@PathVariable Long sampleId,
                                              @RequestBody SampleSaveRequest request){
        SampleResponse response = sampleService.update(sampleId, request);

        return ApiResponse.ok(response);
    }

    @Operation(summary = "예시 데이터 삭제")
    @DeleteMapping("/{sampleId}")
    public ApiResponse<Void> delete(@PathVariable Long sampleId){
        sampleService.delete(sampleId);

        return ApiResponse.ok();
    }
}
