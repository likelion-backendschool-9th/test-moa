package com.testmoa.backend.service;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 개발자가 적은 GitHub 레포를 owner와 repo로 나눈다. "owner/repo"와 "https://github.com/owner/repo"(끝의 .git·/ 허용)를 받는다.
 * 프론트 validateRepository와 같은 모양이고, 이름에 쓸 수 있는 글자만 받아 GitHub 요청 주소에 그대로 넣어도 안전하다
 */
public final class GitHubRepositoryNames {
    private GitHubRepositoryNames() {}

    private static final Pattern REPOSITORY =
            Pattern.compile("^(?:https://github\\.com/)?([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))/([A-Za-z0-9._-]{1,100}?)(?:\\.git)?/?$");

    public record Name(String owner, String repo) {
        /** 저장하고 보여 주는 형태 */
        public String full() {
            return owner + "/" + repo;
        }
    }

    public static Optional<Name> parse(String text) {
        Matcher matcher = REPOSITORY.matcher(text.trim());
        // "."과 ".."는 주소의 경로 이동으로 읽히므로 레포 이름이 아니다
        if (!matcher.matches() || matcher.group(2).matches("\\.{1,2}")) return Optional.empty();
        return Optional.of(new Name(matcher.group(1), matcher.group(2)));
    }

    /** 저장한 "owner/repo"를 다시 나눈다. 저장 때 parse를 거친 값만 있으므로 항상 나뉜다 */
    public static Name of(String full) {
        int slash = full.indexOf('/');
        return new Name(full.substring(0, slash), full.substring(slash + 1));
    }
}
