import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { getLeaveNotice, getProfile } from "@/features/member/api";
import { LeaveSection } from "@/app/(site)/my/(account)/profile/edit/_components/LeaveSection/LeaveSection";
import { PasswordForm } from "@/app/(site)/my/(account)/profile/edit/_components/PasswordForm/PasswordForm";
import { ProfileForm } from "@/app/(site)/my/(account)/profile/edit/_components/ProfileForm/ProfileForm";
import { LinkedAccounts } from "@/app/(site)/my/(account)/profile/edit/_components/LinkedAccounts/LinkedAccounts";
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
  const [profile, params, notice] = await Promise.all([getProfile(PATH), searchParams, getLeaveNotice(PATH)]);
  const text = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  return (
    <SettingsCard>
      <ProfileForm profile={profile} />
      <PasswordForm hasPassword={profile.hasPassword !== false} />
      {profile.providers && (
        <LinkedAccounts
          providers={profile.providers}
          notice={{ linked: text("linked"), unlinked: text("unlinked"), accountError: text("accountError") }}
        />
      )}
      <LeaveSection notice={notice} />
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
