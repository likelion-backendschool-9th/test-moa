package com.testmoa.backend.global.file;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.SequenceInputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 파일 저장 공용 코드. 스프링 없이 임시 폴더에서 확인한다
 */
class FileStorageTest {

    @TempDir Path dir;

    @Test
    void 복사_도중_실패하면_반쯤_쓴_파일을_지우고_원래_오류를_남긴다() throws IOException {
        FileStorage storage = new FileStorage(dir.toString());
        IOException broken = new IOException("읽기 실패");
        // 8KB를 읽은 뒤 끊기는 입력
        MockMultipartFile file = new MockMultipartFile("files", "a.png", "image/png", new byte[0]) {
            @Override
            public InputStream getInputStream() {
                return new SequenceInputStream(new ByteArrayInputStream(new byte[8192]), new InputStream() {
                    @Override
                    public int read() throws IOException {
                        throw broken;
                    }
                });
            }
        };

        assertThatThrownBy(() -> storage.save("reports", file, FileStorage.Kind.PNG))
                .isInstanceOf(UncheckedIOException.class)
                .hasCause(broken);
        try (Stream<Path> files = Files.list(dir.resolve("reports"))) {
            assertThat(files).isEmpty();
        }
    }

    @Test
    void 업로드_폴더_밖의_경로는_읽지_않는다() {
        FileStorage storage = new FileStorage(dir.toString());
        assertThatThrownBy(() -> storage.load("../secret.txt")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 파일_앞부분으로_종류를_정한다() {
        assertThat(FileStorage.detect(new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})).contains(FileStorage.Kind.PNG);
        assertThat(FileStorage.detect(new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0})).contains(FileStorage.Kind.JPG);
        assertThat(FileStorage.detect("RIFF0000WEBP".getBytes())).contains(FileStorage.Kind.WEBP);
        assertThat(FileStorage.detect("%PDF-1.7".getBytes())).contains(FileStorage.Kind.PDF);
        assertThat(FileStorage.detect("hello".getBytes())).isEmpty();
        assertThat(FileStorage.detect("RIFF0000WAVE".getBytes())).isEmpty();
    }
}
