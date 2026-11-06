import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { getProfile } from "@/features/my/api";
import { settingsCardClass, settingsSectionClass } from "@/app/(site)/my/(account)/_components/card-styles";
import { PasswordForm } from "@/app/(site)/my/(account)/profile/edit/_components/PasswordForm";
import { ProfileForm } from "@/app/(site)/my/(account)/profile/edit/_components/ProfileForm";

export const metadata: Metadata = { title: "개인정보 수정" };

const PATH = "/my/profile/edit";

/* 제목은 정적 셸에 두고, 세션을 읽는 폼만 Suspense 안에서 스트리밍한다 */
export default function ProfileEditPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-[-0.03em]">개인정보 수정</h1>
      <Suspense fallback={<ProfileEditSkeleton />}>
        <ProfileEdit />
      </Suspense>
    </div>
  );
}

async function ProfileEdit() {
  const profile = await getProfile(PATH);
  return (
    <div className={settingsCardClass}>
      <ProfileForm profile={profile} />
      <PasswordForm />
    </div>
  );
}

function ProfileEditSkeleton() {
  return (
    <div aria-busy="true" aria-label="개인정보 불러오는 중" className={settingsCardClass}>
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index} className={settingsSectionClass}>
          <Skeleton className="h-6 w-24" />
          <div className="flex flex-col gap-5 lg:col-span-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
