package com.testmoa.backend.service.impl;

import com.testmoa.backend.dto.request.CashoutRejectRequest;
import com.testmoa.backend.dto.response.AdminCashoutResponse;
import com.testmoa.backend.dto.response.CashoutResponse;
import com.testmoa.backend.entity.CashoutRequest;
import com.testmoa.backend.entity.CreditLedger;
import com.testmoa.backend.entity.CreditWallet;
import com.testmoa.backend.entity.User;
import com.testmoa.backend.repository.CashoutRequestRepository;
import com.testmoa.backend.repository.CreditLedgerRepository;
import com.testmoa.backend.repository.CreditWalletRepository;
import com.testmoa.backend.entity.enums.CashoutRejectReason;
import com.testmoa.backend.entity.enums.CashoutStatus;
import com.testmoa.backend.entity.enums.CashoutTab;
import com.testmoa.backend.entity.enums.CreditType;
import com.testmoa.backend.global.security.Role;
import com.testmoa.backend.entity.enums.UserStatus;
import com.testmoa.backend.global.exception.BusinessException;
import com.testmoa.backend.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminCashoutServiceImplTest {

    private static final Long USER_ID = 1L;
    private static final Long CASHOUT_ID = 7L;

    @Mock
    private CashoutRequestRepository cashoutRequestRepository;
    @Mock
    private CreditWalletRepository creditWalletRepository;
    @Mock
    private CreditLedgerRepository creditLedgerRepository;

    @InjectMocks
    private AdminCashoutServiceImpl service;

    @Test
    @DisplayName("#68-S1 지급하면 잠김이 줄고 장부에 출금 지급 한 줄이 남는다")
    void payConfirmsLockedAndWritesLedger() {
        CashoutRequest cashout = requested(5000);
        CreditWallet wallet = walletWithLocked(cashout, 5000);

        AdminCashoutResponse response = service.pay(CASHOUT_ID);

        assertEquals(CashoutStatus.PAID, cashout.getStatus());
        assertEquals(CashoutStatus.PAID, response.getStatus());
        assertNotNull(cashout.getProcessedAt());
        assertEquals(0, wallet.getLockedBalance());
        assertEquals(0, wallet.getEarnedBalance());
        ArgumentCaptor<CreditLedger> captor = ArgumentCaptor.forClass(CreditLedger.class);
        verify(creditLedgerRepository).save(captor.capture());
        assertEquals(-5000, captor.getValue().getDelta());
        assertEquals(CreditType.EARNED, captor.getValue().getType());
        assertEquals("출금 지급", captor.getValue().getDescription());
    }

    @Test
    @DisplayName("#68-S2 반려하면 잠김이 적립으로 돌아오고 장부는 없다")
    void rejectReleasesLockedWithoutLedger() {
        CashoutRequest cashout = requested(5000);
        CreditWallet wallet = walletWithLocked(cashout, 5000);

        AdminCashoutResponse response = service.reject(
                CASHOUT_ID, new CashoutRejectRequest(CashoutRejectReason.ACCOUNT, null));

        assertEquals(CashoutStatus.REJECTED, cashout.getStatus());
        assertEquals(CashoutRejectReason.ACCOUNT, response.getRejectReason());
        assertEquals(0, wallet.getLockedBalance());
        assertEquals(5000, wallet.getEarnedBalance());
        verify(creditLedgerRepository, never()).save(any());
    }

    @Test
    @DisplayName("#68-S3 이미 처리한 요청은 다시 처리할 수 없다")
    void alreadyProcessedIsConflict() {
        CashoutRequest paid = requested(5000);
        paid.pay(java.time.LocalDateTime.now());
        CashoutRequest rejected = requested(3000);
        rejected.reject(CashoutRejectReason.HOLDER, null, java.time.LocalDateTime.now());

        when(cashoutRequestRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(paid));
        when(cashoutRequestRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(rejected));

        for (BusinessException e : List.of(
                assertThrows(BusinessException.class, () -> service.pay(1L)),
                assertThrows(BusinessException.class, () -> service.reject(
                        1L, new CashoutRejectRequest(CashoutRejectReason.HOLDER, null))),
                assertThrows(BusinessException.class, () -> service.pay(2L)),
                assertThrows(BusinessException.class, () -> service.reject(
                        2L, new CashoutRejectRequest(CashoutRejectReason.OTHER, "메모"))))) {
            assertEquals(ErrorCode.CASHOUT_ALREADY_PROCESSED, e.getErrorCode());
        }
        verify(creditWalletRepository, never()).findByUserIdForUpdate(any());
        verify(creditLedgerRepository, never()).save(any());
    }

    @Test
    @DisplayName("#68-S4 기타 반려는 메모가 필수이고 다른 사유의 메모는 회원에게 보인다")
    void rejectMemoRules() {
        CashoutRequest other = requested(5000);
        CreditWallet wallet = walletWithLocked(other, 5000);

        BusinessException blank = assertThrows(BusinessException.class, () -> service.reject(
                CASHOUT_ID, new CashoutRejectRequest(CashoutRejectReason.OTHER, "   ")));
        assertEquals(ErrorCode.INVALID_INPUT, blank.getErrorCode());
        assertEquals(CashoutStatus.REQUESTED, other.getStatus());
        assertEquals(5000, wallet.getLockedBalance());

        AdminCashoutResponse holder = service.reject(
                CASHOUT_ID, new CashoutRejectRequest(CashoutRejectReason.HOLDER, "통장 사본의 이름과 달라요"));

        assertEquals("통장 사본의 이름과 달라요", holder.getRejectMemo());
        /* 회원 출금 내역(#67-S6)에도 같은 메모가 보인다 */
        assertEquals("통장 사본의 이름과 달라요", CashoutResponse.of(other).getRejectMemo());
    }

    @Test
    @DisplayName("#68-S5 대기는 신청 오래된 순, 완료는 최근 처리 순으로 읽고 잘못된 탭은 400")
    void listUsesTabOrdering() {
        CashoutRequest a = requested(1000);
        CashoutRequest b = requested(2000);
        when(cashoutRequestRepository.findByStatusOrderByCreatedAtAsc(CashoutStatus.REQUESTED))
                .thenReturn(List.of(a, b));
        when(cashoutRequestRepository.findByStatusInOrderByProcessedAtDesc(
                List.of(CashoutStatus.PAID, CashoutStatus.REJECTED))).thenReturn(List.of(b, a));

        assertEquals(List.of(1000, 2000),
                service.getCashouts(CashoutTab.PENDING).stream().map(AdminCashoutResponse::getAmount).toList());
        assertEquals(List.of(2000, 1000),
                service.getCashouts(CashoutTab.DONE).stream().map(AdminCashoutResponse::getAmount).toList());

        BusinessException e = assertThrows(BusinessException.class, () -> CashoutTab.fromQuery("all"));
        assertEquals(ErrorCode.INVALID_INPUT, e.getErrorCode());
        assertEquals(CashoutTab.PENDING, CashoutTab.fromQuery(null));
    }

    @Test
    @DisplayName("#68-S6 대기 건은 계좌 전체, 완료 건은 끝 4자리·예금주 가운데 가림")
    void masksAccountAfterProcessing() {
        CashoutRequest pending = requested(5000);
        CashoutRequest done = requested(5000);
        done.pay(java.time.LocalDateTime.now());

        AdminCashoutResponse pendingView = AdminCashoutResponse.of(pending);
        AdminCashoutResponse doneView = AdminCashoutResponse.of(done);

        assertEquals("100012345678", pendingView.getAccountNumber());
        assertEquals("한서윤", pendingView.getAccountHolder());
        assertEquals("****5678", doneView.getAccountNumber());
        assertEquals("한*윤", doneView.getAccountHolder());
        assertEquals("tester", pendingView.getNickname());
        assertEquals("한서윤", pendingView.getUserName());
        assertNull(pendingView.getRejectReason());
    }

    @Test
    @DisplayName("#68-S8 없는 요청은 404")
    void unknownRequestIsNotFound() {
        when(cashoutRequestRepository.findByIdForUpdate(99L)).thenReturn(Optional.empty());
        when(cashoutRequestRepository.findWithUserById(99L)).thenReturn(Optional.empty());

        assertEquals(ErrorCode.NOT_FOUND, assertThrows(BusinessException.class, () -> service.getCashout(99L)).getErrorCode());
        assertEquals(ErrorCode.NOT_FOUND, assertThrows(BusinessException.class, () -> service.pay(99L)).getErrorCode());
        assertEquals(ErrorCode.NOT_FOUND, assertThrows(BusinessException.class, () -> service.reject(
                99L, new CashoutRejectRequest(CashoutRejectReason.ACCOUNT, null))).getErrorCode());
    }

    private CashoutRequest requested(int amount) {
        User user = User.builder()
                .name("한서윤")
                .nickname("tester")
                .email("tester@example.com")
                .role(Role.USER)
                .status(UserStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(user, "id", USER_ID);
        CashoutRequest cashout = CashoutRequest.builder()
                .user(user)
                .amount(amount)
                .bank("토스뱅크")
                .accountNumber("100012345678")
                .accountHolder("한서윤")
                .build();
        ReflectionTestUtils.setField(cashout, "id", CASHOUT_ID);
        return cashout;
    }

    /** 적립 amount를 잠가 둔 지갑을 만들고, 요청·지갑 조회를 연결한다 */
    private CreditWallet walletWithLocked(CashoutRequest cashout, int locked) {
        CreditWallet wallet = CreditWallet.builder().user(cashout.getUser()).build();
        wallet.grantEarned(locked);
        wallet.lockForCashout(locked);
        when(cashoutRequestRepository.findByIdForUpdate(CASHOUT_ID)).thenReturn(Optional.of(cashout));
        when(creditWalletRepository.findByUserIdForUpdate(USER_ID)).thenReturn(Optional.of(wallet));
        return wallet;
    }
}
