package com.testmoa.backend.repository;

import com.testmoa.backend.entity.Cashout;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.crypto.EncryptedStringConverter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jpa.test.autoconfigure.AutoConfigureTestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

@DataJpaTest
@AutoConfigureTestEntityManager
@ActiveProfiles("test")
@Import(EncryptedStringConverter.class)
class CashoutRepositoryTest {

    @Autowired
    private CashoutRepository cashoutRepository;
    @Autowired
    private org.springframework.boot.jpa.test.autoconfigure.TestEntityManager entityManager;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("#67-S2 DB의 계좌·예금주는 평문이 아니다")
    void storesEncryptedAccountFields() {
        User user = User.builder()
                .name("한서윤")
                .nickname("cashout-enc")
                .email("cashout-enc@example.com")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build();
        entityManager.persist(user);

        Cashout saved = cashoutRepository.save(Cashout.builder()
                .user(user)
                .amount(5000)
                .bank("토스뱅크")
                .accountNumber("100012345678")
                .accountHolder("한서윤")
                .build());
        entityManager.flush();
        entityManager.clear();

        String accountNumber = jdbcTemplate.queryForObject(
                "select account_number from cashouts where id = ?",
                String.class,
                saved.getId()
        );
        String accountHolder = jdbcTemplate.queryForObject(
                "select account_holder from cashouts where id = ?",
                String.class,
                saved.getId()
        );
        assertNotEquals("100012345678", accountNumber);
        assertNotEquals("한서윤", accountHolder);
        assertFalse(accountNumber.contains("100012345678"));
        assertFalse(accountHolder.contains("한서윤"));

        Cashout loaded = cashoutRepository.findById(saved.getId()).orElseThrow();
        assertEquals("100012345678", loaded.getAccountNumber());
        assertEquals("한서윤", loaded.getAccountHolder());
    }
}
