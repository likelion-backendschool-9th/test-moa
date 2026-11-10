package com.testmoa.backend.global.client.pg;

/**
 * 구독 현금 결제(PG) 설정(application.yml의 payment.*). 키는 환경 변수로만 넘기고 커밋하지 않는다.
 *
 * @param returnBaseUrl 결제 뒤 돌아올 사이트 주소. 화면이 보낸 값은 쓰지 않는다
 * @param kakaopay      카카오페이 설정
 * @param tosspayments  토스페이먼츠 설정
 */
@org.springframework.boot.context.properties.ConfigurationProperties("payment")
public record PaymentProperties(String returnBaseUrl, Kakaopay kakaopay, Tosspayments tosspayments) {

    /** @param secretKey 카카오페이 디벨로퍼스의 Secret key(dev). 비어 있으면 카카오페이를 쓸 수 없다 */
    public record Kakaopay(String baseUrl, String secretKey, String cid) {
        public boolean configured() {
            return notBlank(secretKey) && notBlank(cid);
        }
    }

    /** @param clientKey 브라우저에 내려가는 test_ck_… 키. @param secretKey 서버만 쓰는 test_sk_… 키 */
    public record Tosspayments(String baseUrl, String clientKey, String secretKey) {
        public boolean configured() {
            return notBlank(clientKey) && notBlank(secretKey);
        }
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
