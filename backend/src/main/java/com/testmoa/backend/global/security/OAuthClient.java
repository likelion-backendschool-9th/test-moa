package com.testmoa.backend.global.security;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 소셜 로그인 제공자(Google·GitHub)와 통신한다. 브라우저를 제공자 동의 화면으로 보낼 주소를 만들고,
 * 돌아온 code를 제공자 access 토큰으로 바꿔 회원 정보를 읽는다. 제공자 토큰은 저장하지 않는다.
 * 테스트에서는 이 클래스만 가짜로 바꿔 제공자 없이 로그인 흐름을 확인한다
 */
@Component
public class OAuthClient {

    /** 제공자에게서 읽은 회원 정보. email은 제공자가 확인한 이메일일 때만 emailVerified가 true다 */
    public record OAuthProfile(Provider provider, String providerCode, String email, boolean emailVerified, String nickname) {}

    private final Map<Provider, App> apps;
    private final RestClient http;

    public OAuthClient(@Value("${oauth.google.client-id}") String googleId,
                       @Value("${oauth.google.client-secret}") String googleSecret,
                       @Value("${oauth.github.client-id}") String githubId,
                       @Value("${oauth.github.client-secret}") String githubSecret) {
        this.apps = Map.of(Provider.GOOGLE, new App(googleId, googleSecret), Provider.GITHUB, new App(githubId, githubSecret));
        SimpleClientHttpRequestFactory timeouts = new SimpleClientHttpRequestFactory();
        timeouts.setConnectTimeout(Duration.ofSeconds(5));
        timeouts.setReadTimeout(Duration.ofSeconds(5));
        this.http = RestClient.builder().requestFactory(timeouts).build();
    }

    /** 주소의 제공자 이름(google, github). 그 밖의 이름은 없는 주소로 본다 */
    public static Provider parse(String provider) {
        return switch (provider.toLowerCase(Locale.ROOT)) {
            case "google" -> Provider.GOOGLE;
            case "github" -> Provider.GITHUB;
            default -> throw new BusinessException(ErrorCode.NOT_FOUND);
        };
    }

    /** 제공자 동의 화면 주소. state는 프론트가 만들어 쿠키에 두고, 돌아올 때 같은지 확인한다 */
    public String authorizeUrl(Provider provider, String redirectUri, String state) {
        App app = app(provider);
        boolean google = provider == Provider.GOOGLE;
        return UriComponentsBuilder
                .fromUriString(google ? "https://accounts.google.com/o/oauth2/v2/auth" : "https://github.com/login/oauth/authorize")
                .queryParam("client_id", app.id())
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParam("scope", google ? "openid email profile" : "read:user user:email")
                .queryParam("state", state)
                .encode()
                .toUriString();
    }

    /** 돌아온 code로 회원 정보를 읽는다. code가 틀렸거나 제공자와 통신하지 못하면 OAUTH_FAILED */
    public OAuthProfile fetchProfile(Provider provider, String code, String redirectUri) {
        try {
            String accessToken = exchange(provider, code, redirectUri);
            return provider == Provider.GOOGLE ? google(accessToken) : github(accessToken);
        } catch (RestClientException e) {
            throw new BusinessException(ErrorCode.OAUTH_FAILED);
        }
    }

    private String exchange(Provider provider, String code, String redirectUri) {
        App app = app(provider);
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("code", code);
        form.add("client_id", app.id());
        form.add("client_secret", app.secret());
        form.add("redirect_uri", redirectUri);
        form.add("grant_type", "authorization_code");

        TokenResponse token = http.post()
                .uri(provider == Provider.GOOGLE ? "https://oauth2.googleapis.com/token" : "https://github.com/login/oauth/access_token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .accept(MediaType.APPLICATION_JSON)
                .body(form)
                .retrieve()
                .body(TokenResponse.class);
        // GitHub은 틀린 code에도 200과 error를 준다
        if (token == null || token.accessToken() == null) throw new BusinessException(ErrorCode.OAUTH_FAILED);
        return token.accessToken();
    }

    private OAuthProfile google(String accessToken) {
        GoogleUser user = http.get()
                .uri("https://openidconnect.googleapis.com/v1/userinfo")
                .headers(h -> h.setBearerAuth(accessToken))
                .retrieve()
                .body(GoogleUser.class);
        if (user == null || user.sub() == null) throw new BusinessException(ErrorCode.OAUTH_FAILED);
        return new OAuthProfile(Provider.GOOGLE, user.sub(), user.email(), Boolean.TRUE.equals(user.emailVerified()), user.name());
    }

    private OAuthProfile github(String accessToken) {
        GithubUser user = http.get()
                .uri("https://api.github.com/user")
                .headers(h -> h.setBearerAuth(accessToken))
                .retrieve()
                .body(GithubUser.class);
        if (user == null || user.id() == null) throw new BusinessException(ErrorCode.OAUTH_FAILED);
        // 프로필의 공개 이메일은 확인 여부를 알 수 없어서, 확인된 대표 이메일을 따로 읽는다
        List<GithubEmail> emails = http.get()
                .uri("https://api.github.com/user/emails")
                .headers(h -> h.setBearerAuth(accessToken))
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
        GithubEmail primary = emails == null ? null : emails.stream()
                .filter(e -> e.primary() && e.verified())
                .findFirst()
                .orElse(null);
        return new OAuthProfile(Provider.GITHUB, String.valueOf(user.id()),
                primary == null ? null : primary.email(), primary != null, user.login());
    }

    private App app(Provider provider) {
        App app = apps.get(provider);
        if (app == null || app.id().isBlank()) throw new BusinessException(ErrorCode.OAUTH_FAILED); // 서버에 앱 값이 없다
        return app;
    }

    private record App(String id, String secret) {}

    private record TokenResponse(@JsonProperty("access_token") String accessToken) {}

    private record GoogleUser(String sub, String email, @JsonProperty("email_verified") Boolean emailVerified, String name) {}

    private record GithubUser(Long id, String login) {}

    private record GithubEmail(String email, boolean primary, boolean verified) {}
}
