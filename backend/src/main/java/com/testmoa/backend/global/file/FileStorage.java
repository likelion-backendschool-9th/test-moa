package com.testmoa.backend.global.file;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Optional;
import java.util.UUID;

/**
 * 올린 파일을 서버 디스크(upload.dir)에 저장하는 공용 코드. 신고 증거(#85)가 처음 쓰고, 프로필 이미지 등도 같이 쓴다.
 * 파일 이름은 무작위로 바꾸고, 종류는 확장자가 아니라 파일 앞부분(시그니처)으로 확인한다. 공개 주소는 없고 API가 읽어서 내려준다
 */
@Component
public class FileStorage {

    /** 받는 파일 종류. 이 밖의 종류는 저장하지 않는다 */
    public enum Kind {
        PNG("image/png", "png"),
        JPG("image/jpeg", "jpg"),
        WEBP("image/webp", "webp"),
        PDF("application/pdf", "pdf");

        private final String contentType;
        private final String extension;

        Kind(String contentType, String extension) {
            this.contentType = contentType;
            this.extension = extension;
        }

        public String contentType() {
            return contentType;
        }
    }

    /** 저장한 파일. path는 업로드 폴더 안의 상대 경로다 */
    public record Stored(String path, Kind kind, long size) {}

    private final Path root;

    public FileStorage(@Value("${upload.dir}") String dir) {
        this.root = Path.of(dir).toAbsolutePath().normalize();
    }

    /** 파일 앞부분으로 종류를 알아낸다. 받는 종류가 아니면 빈 값 */
    public static Optional<Kind> detect(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            return detect(in.readNBytes(12));
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    static Optional<Kind> detect(byte[] head) {
        if (startsWith(head, new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})) return Optional.of(Kind.PNG);
        if (startsWith(head, new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF})) return Optional.of(Kind.JPG);
        if (startsWith(head, ascii("RIFF")) && head.length >= 12
                && Arrays.equals(Arrays.copyOfRange(head, 8, 12), ascii("WEBP"))) return Optional.of(Kind.WEBP);
        if (startsWith(head, ascii("%PDF-"))) return Optional.of(Kind.PDF);
        return Optional.empty();
    }

    /** folder 아래에 무작위 이름으로 저장한다. 종류는 detect로 확인한 값을 넘긴다 */
    public Stored save(String folder, MultipartFile file, Kind kind) {
        String relative = folder + "/" + UUID.randomUUID() + "." + kind.extension;
        Path target = resolve(relative);
        try {
            Files.createDirectories(target.getParent());
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target);
            }
            return new Stored(relative, kind, Files.size(target));
        } catch (IOException e) {
            throw new UncheckedIOException("파일을 저장하지 못했습니다", e);
        }
    }

    /** 저장한 파일을 읽는다. 없으면 빈 값 */
    public Optional<Resource> load(String relative) {
        Path path = resolve(relative);
        return Files.isRegularFile(path) ? Optional.of(new FileSystemResource(path)) : Optional.empty();
    }

    /** 저장한 파일을 지운다. 신고 저장에 실패했을 때 남은 파일을 치운다 */
    public void delete(String relative) {
        try {
            Files.deleteIfExists(resolve(relative));
        } catch (IOException ignored) {
            // 지우지 못한 파일은 다음 정리 때 치운다. 저장 실패의 원래 오류를 덮지 않는다
        }
    }

    // 업로드 폴더 밖을 가리키는 경로(../ 등)는 막는다
    private Path resolve(String relative) {
        Path path = root.resolve(relative).normalize();
        if (!path.startsWith(root)) throw new IllegalArgumentException("업로드 폴더 밖의 경로입니다");
        return path;
    }

    private static boolean startsWith(byte[] data, byte[] prefix) {
        return data.length >= prefix.length && Arrays.equals(Arrays.copyOf(data, prefix.length), prefix);
    }

    private static byte[] ascii(String text) {
        return text.getBytes(StandardCharsets.US_ASCII);
    }
}
