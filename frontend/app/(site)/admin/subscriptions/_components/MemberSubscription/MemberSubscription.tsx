import Form from "next/form";
import { AdminPanel } from "@/app/(site)/admin/_components/AdminPanel/AdminPanel";
import { MemberSubscriptionActions } from "@/app/(site)/admin/subscriptions/_components/MemberSubscriptionActions/MemberSubscriptionActions";
import { Button } from "@/components/ui/Button/Button";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { findMemberSubscription } from "@/features/subscription/api";
import { MEMBER_EMAIL_MAX_LENGTH } from "@/features/subscription/types";
import { formatDate } from "@/lib/format";
import styles from "./MemberSubscription.module.css";

/**
 * 이메일 검색. GET 양식이라 검색어가 주소(email)에 남고, next/form이 페이지를 새로 받지 않고 이동한다.
 * 같은 페이지 이동에서는 입력칸이 그대로 남아 defaultValue가 다시 적용되지 않으므로, 주소의 검색어가 바뀌면 key로 새로 그린다.
 */
export function MemberSearch({ email }: { email: string }) {
  return (
    <Form action="/admin/subscriptions" role="search" className={styles.search}>
      <input
        key={email}
        type="email"
        name="email"
        defaultValue={email}
        maxLength={MEMBER_EMAIL_MAX_LENGTH}
        aria-label="회원 이메일"
        placeholder="회원 이메일"
        className={styles.searchInput}
      />
      <Button type="submit" variant="secondary" size="sm">
        검색
      </Button>
    </Form>
  );
}

/** 찾은 회원의 닉네임·이메일·구독 상태와, 구독을 주고 빼는 버튼 */
export async function MemberSubscriptionResult({ email }: { email: string }) {
  const lookup = await findMemberSubscription(email);
  if (lookup.status === "not-found") {
    return (
      <AdminPanel as="section" aria-label="검색 결과" className={styles.panel}>
        <p className={styles.text}>찾을 수 없어요. 가입한 회원의 이메일인지 확인해 주세요.</p>
      </AdminPanel>
    );
  }
  const { member } = lookup;
  return (
    <AdminPanel as="section" aria-label="회원 구독 상태" className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.name}>{member.nickname}</h2>
        <p className={styles.email}>{member.email}</p>
      </div>
      {!member.eligible ? (
        <p className={styles.text}>운영자 계정은 구독 대상이 아니에요</p>
      ) : (
        <>
          {member.active && member.endAt ? (
            <dl className={styles.list}>
              <div>
                <dt className={styles.term}>구독</dt>
                <dd className={styles.value}>구독 중</dd>
              </div>
              <div>
                <dt className={styles.term}>이용 중인 상품</dt>
                <dd className={styles.value}>{member.plan}</dd>
              </div>
              <div>
                <dt className={styles.term}>만료일</dt>
                <dd className={styles.value}>{formatDate(member.endAt)}</dd>
              </div>
              <div>
                <dt className={styles.term}>남은 날</dt>
                <dd className={styles.value}>{member.remainingDays}일</dd>
              </div>
            </dl>
          ) : (
            <p className={styles.value}>구독하지 않았어요</p>
          )}
          <MemberSubscriptionActions email={member.email} active={member.active} />
        </>
      )}
    </AdminPanel>
  );
}

export function MemberSubscriptionSkeleton() {
  return (
    <div aria-busy="true" aria-label="회원 구독 불러오는 중" className={styles.skeleton}>
      <Skeleton className={styles.skeletonLine} />
      <Skeleton className={styles.skeletonLine} />
      <Skeleton className={styles.skeletonLine} />
    </div>
  );
}

/** 목업 모드의 안내. 구독을 주고 빼는 일은 서버의 회원 상태를 바꾸는 것이라 목업으로 흉내 내지 않는다 */
export function MockNotice() {
  return (
    <AdminPanel as="section" aria-label="안내" className={styles.panel}>
      <p className={styles.value}>백엔드와 연결했을 때 쓸 수 있어요</p>
      <p className={styles.text}>회원의 구독을 주고 빼는 일은 서버에 있는 회원의 상태를 바꾸는 것이라, 목업에서는 쓸 수 없어요.</p>
    </AdminPanel>
  );
}
