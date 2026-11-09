package com.testmoa.backend.global.exception;

import com.testmoa.backend.global.util.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * 모든 실패를 ApiResponse.fail 모양으로 바꾼다.
 * 스프링 기본 예외(없는 주소, 잘못된 JSON, 지원하지 않는 메서드 등)는 상위 클래스가 받아 handleExceptionInternal로 넘긴다
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    // 서비스가 던진 규칙 위반
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException e) {
        ErrorCode code = e.getErrorCode();
        // SSE만 Accept한 요청도 인증 실패 본문은 JSON으로 받는다.
        return ResponseEntity.status(code.getStatus()).contentType(MediaType.APPLICATION_JSON)
                .body(ApiResponse.fail(code, e.getMessage(), e.getFields()));
    }

    // 예상하지 못한 오류. 내용은 로그에만 남기고 응답에는 싣지 않는다
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception e) {
        log.error("처리하지 못한 예외", e);
        ErrorCode code = ErrorCode.INTERNAL_ERROR;
        return ResponseEntity.status(code.getStatus()).body(ApiResponse.fail(code));
    }

    // @Valid 검사 실패. 칸별 문구를 fields에 담는다 (같은 칸에 오류가 여럿이면 첫 번째)
    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException e, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> fields = new LinkedHashMap<>();
        for (FieldError error : e.getBindingResult().getFieldErrors()) {
            fields.putIfAbsent(error.getField(), Objects.requireNonNullElse(error.getDefaultMessage(), ""));
        }
        ErrorCode code = ErrorCode.INVALID_INPUT;
        return ResponseEntity.status(code.getStatus()).body(ApiResponse.fail(code, code.getMessage(), fields));
    }

    // 업로드 한도(한 장 5MB, 요청 30MB)를 넘은 파일. 상태는 413 그대로 두고, 화면이 파일 칸 아래에 보일 문구를 준다
    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(
            MaxUploadSizeExceededException e, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String message = "파일은 한 장 5MB까지 올릴 수 있어요";
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_JSON)
                .body(ApiResponse.fail(ErrorCode.INVALID_INPUT, message, Map.of("files", message)));
    }

    // 스프링 기본 예외. 상태 코드는 스프링이 정한 대로 두고 응답 모양만 맞춘다
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception e, Object body, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ErrorCode code = status.value() == 404 ? ErrorCode.NOT_FOUND
                : status.is5xxServerError() ? ErrorCode.INTERNAL_ERROR
                : ErrorCode.INVALID_INPUT;
        return ResponseEntity.status(status).headers(headers).body(ApiResponse.fail(code));
    }
}
