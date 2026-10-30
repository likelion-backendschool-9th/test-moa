"use client";

import { type FormEvent, startTransition, useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { type FormState, type ProfileField, updateProfile } from "../actions";
import type { Profile } from "../types";
import { cardClass, cardTitleClass } from "./card-styles";
import { FormField, FormMessage } from "./FormField";

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
    <section aria-labelledby="profile-form-heading" className={cardClass}>
      <h2 id="profile-form-heading" className={cardTitleClass}>
        기본 정보
      </h2>
      {state.status === "success" && <FormMessage status="success" message={state.message} />}
      {errors.form && <FormMessage status="error" message={errors.form} />}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="grid gap-x-4 gap-y-5 md:grid-cols-2">
          <FormField id="profile-name" name="name" label="이름" autoComplete="name" defaultValue={profile.name} error={errors.name} />
          <FormField
            id="profile-nickname"
            name="nickname"
            label="닉네임"
            autoComplete="nickname"
            defaultValue={profile.nickname}
            hint="한글·영문·숫자 2~12자"
            error={errors.nickname}
          />
          <FormField id="profile-email" label="이메일" type="email" value={profile.email} readOnly hint="이메일은 바꿀 수 없어요" />
        </div>
        <div className="flex md:justify-end">
          <Button type="submit" disabled={pending} className="w-full md:w-auto">
            {pending ? "저장하는 중…" : "저장"}
          </Button>
        </div>
      </form>
    </section>
  );
}
