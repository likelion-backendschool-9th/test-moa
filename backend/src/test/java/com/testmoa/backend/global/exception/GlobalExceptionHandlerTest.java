package com.testmoa.backend.global.exception;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 실패가 ApiResponse.fail 모양으로 내려가는지 확인한다. DB 없이 컨트롤러 하나만 띄운다
 */
class GlobalExceptionHandlerTest {

    @RestController
    static class TestController {
        record NameRequest(@NotBlank(message = "이름을 입력해 주세요") String name) {}

        @GetMapping("/business")
        void business() { throw new BusinessException(ErrorCode.NOT_FOUND); }

        @GetMapping("/boom")
        void boom() { throw new IllegalStateException("내부 정보"); }

        @PostMapping("/valid")
        void valid(@Valid @RequestBody NameRequest request) {}
    }

    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new TestController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void 규칙_위반은_에러_코드의_상태와_코드로_응답한다() throws Exception {
        mvc.perform(get("/business"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("찾을 수 없어요"))
                .andExpect(jsonPath("$.error.fields").doesNotExist());
    }

    @Test
    void 입력_검사_실패는_칸별_문구를_담는다() throws Exception {
        mvc.perform(post("/valid").contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.fields.name").value("이름을 입력해 주세요"));
    }

    @Test
    void 잘못된_JSON은_400_INVALID_INPUT이다() throws Exception {
        mvc.perform(post("/valid").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
    }

    @Test
    void 예상하지_못한_오류는_내부_내용을_숨긴다() throws Exception {
        mvc.perform(get("/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.error.message").value("잠시 후 다시 시도해 주세요"));
    }
}
