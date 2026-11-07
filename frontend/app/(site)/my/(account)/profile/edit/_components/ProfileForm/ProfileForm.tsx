"use client";

import { type FormEvent, startTransition, useActionState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { FormField, FormMessage } from "@/components/ui/FormField/FormField";
import type { FormState } from "@/lib/form";
import { NICKNAME_HINT } from "@/features/member/validation";
import { type ProfileField, updateProfile } from "@/features/member/actions";
import type { Profile } from "@/features/member/types";
import { SettingsBody, SettingsSection } from "@/app/(site)/my/(account)/_components/SettingsCard/SettingsCard";
import { AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import styles from "./ProfileForm.module.css";


const initialState: FormState<ProfileField> = { status: "idle" };

/** 이름·닉네임 수정. 입력 검사는 서버에서 하고, 저장해도 입력한 값은 칸에 남는다 */
export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  /* React가 폼 액션 뒤 칸을 원래 값으로 되돌리지 않게 직접 제출한다 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const errors = state.status === "error" ? state.errors : {};
  return (
    <SettingsSection aria-labelledby="profile-form-heading">
      <div className={styles.box}>
        <AccountCardTitle id="profile-form-heading">
          기본 정보
        </AccountCardTitle>
        <p className={styles.text}>이름과 닉네임을 바꿀 수 있어요.</p>
      </div>
      <SettingsBody>
        {state.status === "success" && <FormMessage status="success" message={state.message} />}
        {errors.form && <FormMessage status="error" message={errors.form} />}
        {/* JS가 아직 없을 때도 비밀번호가 주소(GET)로 나가지 않게 서버 액션으로 POST 제출한다. JS가 있으면 handleSubmit이 대신 제출한다 */}
        <form action={formAction} onSubmit={handleSubmit} noValidate className={styles.form}>
          <div className={styles.box2}>
            <FormField id="profile-name" name="name" label="이름" autoComplete="name" defaultValue={profile.name} error={errors.name} />
            <FormField
              id="profile-nickname"
              name="nickname"
              label="닉네임"
              autoComplete="nickname"
              defaultValue={profile.nickname}
              hint={NICKNAME_HINT}
              error={errors.nickname}
            />
            <FormField id="profile-email" label="이메일" type="email" value={profile.email} readOnly hint="이메일은 바꿀 수 없어요" />
          </div>
          <div className={styles.box3}>
            <Button type="submit" disabled={pending} className={styles.button}>
              {pending ? "저장하는 중…" : "저장"}
            </Button>
          </div>
        </form>
      </SettingsBody>
    </SettingsSection>
  );
}
