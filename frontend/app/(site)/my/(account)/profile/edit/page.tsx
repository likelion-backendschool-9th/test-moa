import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { getLinkedAccounts, getProfile } from "@/features/member/api";
import { isBackendAuth } from "@/lib/backend";
import { LinkedAccounts } from "@/app/(site)/my/(account)/profile/edit/_components/LinkedAccounts/LinkedAccounts";
import { PasswordForm } from "@/app/(site)/my/(account)/profile/edit/_components/PasswordForm/PasswordForm";
import { ProfileForm } from "@/app/(site)/my/(account)/profile/edit/_components/ProfileForm/ProfileForm";
import { SettingsCard, SettingsSection } from "@/components/ui/SettingsCard/SettingsCard";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "개인정보 수정" };

const PATH = "/my/profile/edit";

/* 제목은 정적 셸에 두고, 세션을 읽는 폼만 Suspense 안에서 스트리밍한다 */
export default function ProfileEditPage({ searchParams }: PageProps<"/my/profile/edit">) {
  return (
    <div className={styles.profileEditPage}>
      <h1 className={styles.profileEditPageTitle}>개인정보 수정</h1>
      <Suspense fallback={<ProfileEditSkeleton />}>
        <ProfileEdit searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProfileEdit({ searchParams }: { searchParams: PageProps<"/my/profile/edit">["searchParams"] }) {
  /* 연동된 계정(#84)은 실제 로그인에서만 있다. 결과 문구는 주소의 키(linked·unlinked·accountError·unlinkError)로 고른다 */
  const [profile, linked, params] = await Promise.all([getProfile(PATH), isBackendAuth ? getLinkedAccounts(PATH) : null, searchParams]);
  const text = (key: string) => (typeof params[key] === "string" ? params[key] : undefined);
  return (
    <SettingsCard>
      <ProfileForm profile={profile} />
      <PasswordForm />
      {linked && (
        <LinkedAccounts
          providers={linked.providers}
          emails={linked.emails}
          notice={{ linked: text("linked"), unlinked: text("unlinked"), accountError: text("accountError"), unlinkError: text("unlinkError") }}
        />
      )}
    </SettingsCard>
  );
}

function ProfileEditSkeleton() {
  return (
    <SettingsCard aria-busy="true" aria-label="개인정보 불러오는 중">
      {Array.from({ length: 2 }, (_, index) => (
        <SettingsSection as="div" key={index}>
          <Skeleton className={styles.profileEditSkeletonSkeleton} />
          <div className={styles.profileEditSkeletonBox}>
            <Skeleton className={styles.profileEditSkeletonSkeleton2} />
            <Skeleton className={styles.profileEditSkeletonSkeleton3} />
            <Skeleton className={styles.profileEditSkeletonSkeleton4} />
          </div>
        </SettingsSection>
      ))}
    </SettingsCard>
  );
}
