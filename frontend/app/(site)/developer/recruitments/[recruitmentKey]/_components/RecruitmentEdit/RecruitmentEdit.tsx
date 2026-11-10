"use client";

import { ArrowDownIcon, ArrowUpIcon, DotsSixVerticalIcon } from "@phosphor-icons/react";
import { type ComponentProps, type FormEvent, type ReactNode, startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge/Badge";
import { Button } from "@/components/ui/Button/Button";
import { FormMessage } from "@/components/ui/FormField/FormField";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { SettingsBody, SettingsCard, SettingsSection } from "@/components/ui/SettingsCard/SettingsCard";
import { TextArea, TextInput } from "@/components/ui/TextField/TextField";
import { projectEditPath } from "@/features/project/paths";
import { DEFAULT_PROJECT_IMAGE_URL, EMPTY_FORM_STATE, type Project } from "@/features/project/types";
import { disconnectRepository, updateRecruitment } from "@/features/recruitment/actions";
import { RecruitmentStatusBadge } from "@/features/recruitment/components/RecruitmentStatusBadge/RecruitmentStatusBadge";
import { TestItemImages } from "@/features/recruitment/components/TestItemImages/TestItemImages";
import {
  type EditState,
  RECRUITMENT_LIMIT,
  type RecruitmentDetail,
  type RecruitmentEditLocks,
  type RecruitmentEditSection,
  type RecruitmentView,
  SELECTION_MODE_LABEL,
  SOFTWARE_TYPE_LABEL,
  SOFTWARE_TYPES,
  type TestItem,
  seoulDate,
} from "@/features/recruitment/types";
import { formatCredits } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CancelRecruitmentButton } from "../CancelRecruitmentButton/CancelRecruitmentButton";
import styles from "./RecruitmentEdit.module.css";

/*
 * 모집 정보 탭. 개인정보 수정처럼 한 장의 면을 영역으로 나누고, 영역마다 따로 저장한다.
 * 잠금(RecruitmentEditLocks)은 화면에서 막고, 서버가 다시 확인한다.
 */

type Props = {
  recruitment: RecruitmentView & { version: number };
  detail: RecruitmentDetail;
  project: Project;
  locks: RecruitmentEditLocks;
  canCancel: boolean;
};

export function RecruitmentEdit({ recruitment, detail, project, locks, canCancel }: Props) {
  return (
    <SettingsCard>
      {detail.unavailable && <FormMessage status="error" message="취소된 모집이라 모집 조건, 테스트 항목, 접속 링크를 불러올 수 없어요" />}
      <PostSection recruitment={recruitment} detail={detail} readOnly={locks.readOnly} />
      <TermsSection recruitment={recruitment} detail={detail} locks={locks} canCancel={canCancel} />
      {!detail.unavailable && <TestItemsSection recruitmentKey={recruitment.slug} items={detail.testItems} locks={locks} />}
      <ProjectSection recruitmentKey={recruitment.slug} project={project} />
    </SettingsCard>
  );
}

/** 영역 하나의 저장. React가 폼 액션 뒤 칸을 처음 값으로 되돌리지 않게 직접 제출한다 */
function useSectionForm(recruitmentKey: string, section: RecruitmentEditSection) {
  const [state, formAction, pending] = useActionState<EditState, FormData>(
    updateRecruitment.bind(null, recruitmentKey, section),
    EMPTY_FORM_STATE,
  );
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }
  return { state, formAction, pending, handleSubmit };
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <SettingsSection aria-labelledby={id}>
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      <SettingsBody>{children}</SettingsBody>
    </SettingsSection>
  );
}

/** 필수 표시. 읽는 프로그램에는 입력란의 aria-required로 알린다 */
const RequiredMark = () => (
  <span aria-hidden="true" className={styles.required}>
    *
  </span>
);

type FieldProps = Omit<ComponentProps<"input">, "name"> & {
  name: string;
  label: string;
  error?: string;
  /** 글자 수 한도. 입력란 오른쪽 아래에 "지금/한도"로 보인다 */
  max?: number;
  /** 바꿀 수 없는 값. 입력란을 끄고 한도 자리에 "변경불가"를 적는다 */
  locked?: boolean;
  multiline?: boolean;
};

/* 여러 줄 입력란을 내용 높이에 맞춘다. 그래야 마지막 줄이 늘 입력란 바닥에 있어 글자 수가 그 줄을 따라간다 */
function fitHeight(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

/** 이 탭의 입력란. 글자 수나 "변경불가"를 마지막 줄 오른쪽에 둔다. 한 줄이면 가운데, 줄이 늘면 함께 내려간다 */
function Field({ id: idProp, name, label, error, max, locked, multiline, required, onChange, className, ...props }: FieldProps) {
  const id = idProp ?? `field-${name}`;
  const [typed, setTyped] = useState(String(props.defaultValue ?? ""));
  const length = props.value !== undefined ? String(props.value).length : typed.length;
  const note = locked ? "변경불가" : max ? `${length}/${max}` : null;
  const noteId = `${id}-note`;
  const errorId = `${id}-error`;
  const shared = {
    id,
    name,
    disabled: locked || props.disabled,
    "aria-required": required || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": [note && noteId, error && errorId].filter(Boolean).join(" ") || undefined,
  };
  return (
    <div className={cn(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {required && <RequiredMark />}
      </label>
      <div className={styles.control}>
        {multiline ? (
          <TextArea
            {...shared}
            rows={1}
            ref={fitHeight}
            defaultValue={props.defaultValue as string}
            onChange={(event) => {
              setTyped(event.target.value);
              fitHeight(event.target);
            }}
            className={cn(styles.grow, note && styles.withNoteRight)}
          />
        ) : (
          <TextInput
            {...props}
            {...shared}
            className={cn(note && styles.withNoteRight)}
            onChange={(event) => {
              setTyped(event.target.value);
              onChange?.(event);
            }}
          />
        )}
        {note && (
          <span id={noteId} data-locked={locked || undefined} data-over={(max !== undefined && length > max) || undefined} className={styles.note}>
            {note}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

function Result({ state, success = "저장했어요" }: { state: EditState; success?: string }) {
  if (state.ok) return <FormMessage status="success" message={success} />;
  return state.errors.form ? <FormMessage status="error" message={state.errors.form} /> : null;
}

function SaveButton({ pending, label = "저장" }: { pending: boolean; label?: string }) {
  return (
    <div className={styles.actions}>
      <Button type="submit" disabled={pending} className={styles.save}>
        {pending ? "저장하는 중…" : label}
      </Button>
    </div>
  );
}

/* ---------- 글 정보 ---------- */

function PostSection({ recruitment, detail, readOnly }: { recruitment: Props["recruitment"]; detail: RecruitmentDetail; readOnly: boolean }) {
  const { state, formAction, pending, handleSubmit } = useSectionForm(recruitment.slug, "post");
  const { errors } = state;
  return (
    <Section id="edit-post-heading" title="글 정보">
      <Result state={state} />
      <form action={formAction} onSubmit={handleSubmit} noValidate className={styles.form}>
        <fieldset disabled={readOnly} className={styles.fields}>
          <Field name="title" label="제목" required defaultValue={detail.title} max={RECRUITMENT_LIMIT.titleLength} error={errors.title} />
          <Field name="request" label="설명" required multiline defaultValue={recruitment.request} max={5000} error={errors.request} />
          {/* 공개 API에는 접속 링크가 없어 비어 올 수 있다. 이때는 비워 두면 기존 링크를 유지한다 */}
          {!detail.accessUrl && <input type="hidden" name="accessUrlKept" value="1" />}
          <Field name="accessUrl" label="접속 링크" required={Boolean(detail.accessUrl)} type="url" inputMode="url" placeholder={detail.accessUrl ? "https://" : "비워 두면 기존 링크를 유지해요"} defaultValue={detail.accessUrl} error={errors.accessUrl} />
          <Field name="version" label="현재 버전" value={`v${recruitment.version}`} locked readOnly />
          <fieldset className={styles.group} aria-describedby={errors.categories ? "field-categories-error" : undefined}>
            <legend className={styles.label}>
              카테고리
              <RequiredMark />
            </legend>
            <div className={styles.options}>
              {SOFTWARE_TYPES.map((type) => (
                <label key={type} className={styles.option}>
                  <input type="checkbox" name="categories" value={type} defaultChecked={recruitment.softwareTypes.includes(type)} />
                  {SOFTWARE_TYPE_LABEL[type]}
                </label>
              ))}
            </div>
            {errors.categories && <p id="field-categories-error" className={styles.error}>{errors.categories}</p>}
          </fieldset>
        </fieldset>
        {!readOnly && <SaveButton pending={pending} />}
      </form>
    </Section>
  );
}

/* ---------- 모집 정보 ---------- */

function TermsSection({ recruitment, detail, locks, canCancel }: { recruitment: Props["recruitment"]; detail: RecruitmentDetail; locks: RecruitmentEditLocks; canCancel: boolean }) {
  const { state, formAction, pending, handleSubmit } = useSectionForm(recruitment.slug, "terms");
  const { errors } = state;
  const recruitDeadline = seoulDate(new Date(recruitment.recruitDeadline));
  const submitDeadline = seoulDate(new Date(recruitment.submitDeadline));
  const reward = `기본 ${formatCredits(recruitment.baseReward)}${recruitment.extraReward !== undefined ? ` · 추가 ${formatCredits(recruitment.extraReward)}` : ""}`;
  return (
    <Section id="edit-terms-heading" title="모집 정보">
      <Result state={state} />
      {/* 취소 버튼은 자기 폼이 있는 대화상자를 열어서 저장 폼 밖에 둔다 */}
      <div className={styles.status}>
        <span className={styles.label}>모집 상태</span>
        {/* 취소한 모집은 위의 취소 안내가 상태를 알려서 배지와 버튼을 두지 않는다 */}
        {recruitment.status !== "cancelled" && (
          <>
            <RecruitmentStatusBadge status={recruitment.status} />
            <span className={styles.statusEnd}>
              {canCancel ? (
                <CancelRecruitmentButton recruitmentKey={recruitment.slug} reasonRequired={recruitment.status === "testing"} />
              ) : (
                <Button type="button" size="sm" variant="secondary" disabled>
                  모집 취소
                </Button>
              )}
            </span>
          </>
        )}
      </div>
      <form action={formAction} onSubmit={handleSubmit} noValidate className={styles.form}>
        <fieldset disabled={locks.readOnly} className={styles.fields}>
          {!detail.unavailable && (
            <Field name="conditions" label="모집 조건" multiline defaultValue={detail.conditions} max={RECRUITMENT_LIMIT.conditionsLength} error={errors.conditions} />
          )}
          <fieldset className={styles.group} aria-describedby={errors.selectionMode ? "field-selectionMode-error" : undefined}>
            <legend className={styles.label}>
              선정 조건
              <RequiredMark />
            </legend>
            <div className={styles.options}>
              {(["firstCome", "selection"] as const).map((mode) => (
                <label key={mode} className={styles.option}>
                  <input
                    type="radio"
                    name="selectionMode"
                    value={mode}
                    defaultChecked={detail.selectionMode === mode}
                    disabled={locks.selectionMode || (mode === "selection" && !recruitment.isSubscription)}
                  />
                  {SELECTION_MODE_LABEL[mode]}
                </label>
              ))}
            </div>
            {errors.selectionMode && <p id="field-selectionMode-error" className={styles.error}>{errors.selectionMode}</p>}
          </fieldset>
          <div className={styles.dates}>
            <Field
              name="recruitDeadline"
              label="모집 마감일"
              required
              type="date"
              defaultValue={recruitDeadline}
              min={recruitDeadline}
              locked={locks.recruitDeadline}
              error={errors.recruitDeadline}
            />
            <Field name="submitDeadline" label="피드백 제출 마감일" required type="date" defaultValue={submitDeadline} min={submitDeadline} error={errors.submitDeadline} />
          </div>
          <Field name="reward" label="보상" value={reward} locked readOnly />
        </fieldset>
        {!locks.readOnly && <SaveButton pending={pending} />}
      </form>
    </Section>
  );
}

/* ---------- 테스트 정보 ---------- */

type Row = Pick<TestItem, "title" | "description" | "required" | "images"> & {
  /** 화면에서만 쓰는 줄 키. 순서가 바뀌어도 입력 칸과 포커스가 줄을 따라간다 */
  key: string;
  /** 저장된 항목 id. 새 줄은 빈 값 */
  id: string;
};

function TestItemsSection({ recruitmentKey, items, locks }: { recruitmentKey: string; items: TestItem[]; locks: RecruitmentEditLocks }) {
  const { state, formAction, pending, handleSubmit } = useSectionForm(recruitmentKey, "testItems");
  const [rows, setRows] = useState<Row[]>(() => items.map((item) => ({ ...item, key: item.id })));
  const nextKey = useRef(0);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  /* 줄 오류는 제출할 때의 순서로 찾으므로, 줄을 옮기거나 지우면 다음 제출까지 숨긴다 */
  const [dismissedFor, setDismissedFor] = useState<EditState | null>(null);
  const errors = dismissedFor === state ? {} : state.errors;
  const { max, titleLength, descriptionLength } = RECRUITMENT_LIMIT.testItems;
  const editable = !locks.readOnly;

  function update(index: number, change: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= rows.length || from === to) return;
    setRows((prev) => {
      const next = [...prev];
      const [row] = next.splice(from, 1);
      next.splice(to, 0, row);
      return next;
    });
    setDismissedFor(state);
  }

  return (
    <Section id="edit-items-heading" title="테스트 정보">
      <Result state={state} />
      <form action={formAction} onSubmit={handleSubmit} noValidate className={styles.form}>
        <fieldset disabled={!editable} className={styles.fields} aria-label="테스트 항목">
          <ol className={styles.items}>
            {rows.map((row, index) => {
              const locked = locks.lockedItemIds.includes(row.id);
              return (
                <li
                  key={row.key}
                  data-testid="test-item-row"
                  data-dragging={dragIndex === index || undefined}
                  className={styles.item}
                  onDragOver={(event) => {
                    if (dragIndex !== null) event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragIndex !== null) move(dragIndex, index);
                    setDragIndex(null);
                  }}
                >
                  <div className={styles.itemBar}>
                    {editable && (
                      /* 끌기는 마우스용이다. 키보드와 터치는 옆의 위·아래 버튼을 쓴다 */
                      <span
                        aria-hidden
                        draggable
                        className={styles.handle}
                        onDragStart={(event) => {
                          setDragIndex(index);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", String(index));
                          const rowElement = event.currentTarget.closest("li");
                          if (rowElement) event.dataTransfer.setDragImage(rowElement, 16, 16);
                        }}
                        onDragEnd={() => setDragIndex(null)}
                      >
                        <DotsSixVerticalIcon size={18} weight="bold" />
                      </span>
                    )}
                    <span className={styles.itemNumber}>항목 {index + 1}</span>
                    {locked && <Badge tone="muted">피드백 있음</Badge>}
                    {editable && (
                      <span className={styles.itemTools}>
                        {/* 끝에서도 버튼을 끄지 않는다. 끄면 누르던 버튼의 포커스가 사라진다 */}
                        <Button type="button" size="sm" variant="ghost" aria-label={`항목 ${index + 1} 위로`} aria-disabled={index === 0} onClick={() => move(index, index - 1)}>
                          <ArrowUpIcon aria-hidden size={14} weight="bold" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" aria-label={`항목 ${index + 1} 아래로`} aria-disabled={index === rows.length - 1} onClick={() => move(index, index + 1)}>
                          <ArrowDownIcon aria-hidden size={14} weight="bold" />
                        </Button>
                        {/* 피드백이 달린 항목은 지울 수 없어 버튼을 끈다 */}
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={locked || rows.length === 1}
                          aria-label={`항목 ${index + 1} 삭제`}
                          onClick={() => {
                            setRows((prev) => prev.filter((_, i) => i !== index));
                            setDismissedFor(state);
                          }}
                        >
                          삭제
                        </Button>
                      </span>
                    )}
                  </div>
                  <input type="hidden" name="testItemId" value={row.id} />
                  <Field
                    name="testItemTitle"
                    id={`field-testItemTitle-${row.key}`}
                    label={`항목 ${index + 1} 이름`}
                    required
                    value={row.title}
                    onChange={(event) => update(index, { title: event.target.value })}
                    max={titleLength}
                    error={errors[`testItemTitle-${index}`]}
                  />
                  <Field
                    name="testItemDescription"
                    id={`field-testItemDescription-${row.key}`}
                    label={`항목 ${index + 1} 설명`}
                    value={row.description}
                    onChange={(event) => update(index, { description: event.target.value })}
                    max={descriptionLength}
                    error={errors[`testItemDescription-${index}`]}
                  />
                  <div className={styles.group}>
                    <span className={styles.label}>필수 여부</span>
                    <label className={styles.option}>
                      <input type="checkbox" name="testItemRequired" value={index} checked={row.required} onChange={(event) => update(index, { required: event.target.checked })} />
                      <span className={styles.srOnly}>항목 {index + 1} </span>
                      필수
                    </label>
                  </div>
                  {row.images.length > 0 && (
                    <div className={styles.thumbs}>
                      <TestItemImages item={{ ...row, id: row.key }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {errors.testItems && <p className={styles.error}>{errors.testItems}</p>}
          {editable && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className={styles.add}
              disabled={rows.length >= max}
              onClick={() => setRows((prev) => [...prev, { key: `new-${nextKey.current++}`, id: "", title: "", description: "", required: true, images: [] }])}
            >
              항목 추가
            </Button>
          )}
        </fieldset>
        {editable && <SaveButton pending={pending} />}
      </form>
    </Section>
  );
}

/* ---------- 기타 프로젝트 정보 ---------- */

function ProjectSection({ recruitmentKey, project }: { recruitmentKey: string; project: Project }) {
  const { state, formAction, pending, handleSubmit } = useSectionForm(recruitmentKey, "repository");
  const [unlinked, unlinkAction, unlinking] = useActionState<EditState, FormData>(
    disconnectRepository.bind(null, recruitmentKey),
    EMPTY_FORM_STATE,
  );
  /* 토큰은 저장하고 나면 입력란에 남기지 않는다 */
  const tokenRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.ok && tokenRef.current) tokenRef.current.value = "";
  }, [state]);
  return (
    <Section id="edit-project-heading" title="기타 프로젝트 정보">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={project.image?.url ?? DEFAULT_PROJECT_IMAGE_URL} alt={project.image?.name ?? ""} className={styles.projectImage} />
      <Field name="projectName" label="프로젝트 이름" value={project.name} locked readOnly />
      <Field name="projectDescription" label="상세 설명" multiline defaultValue={project.description} locked />
      <div className={styles.end}>
        <LinkButton href={projectEditPath(project.key)} variant="secondary" size="sm">
          프로젝트 수정하러 가기
        </LinkButton>
      </div>
      <Result state={state} success={`${state.values.repository}에 연결했어요`} />
      <Result state={unlinked} success="연결을 해제했어요" />
      {/* 연결한 저장소가 바뀌면 입력란이 새 값(owner/repo)으로 다시 그려진다 */}
      <form key={project.repository ?? ""} action={formAction} onSubmit={handleSubmit} noValidate className={styles.form}>
        <Field name="repository" label="GitHub 저장소" defaultValue={project.repository ?? ""} placeholder="owner/repo 또는 GitHub 주소" error={state.errors.repository} />
        <Field
          ref={tokenRef}
          name="token"
          label="GitHub 토큰"
          type="password"
          autoComplete="off"
          placeholder={project.repository ? "바꾸려면 토큰을 다시 입력해 주세요" : "이슈를 만들 수 있는 토큰"}
          error={state.errors.token}
        />
        <SaveButton pending={pending} label={project.repository ? "다시 연결" : "연결"} />
      </form>
      {project.repository && (
        <form action={unlinkAction} className={styles.form}>
          <div className={styles.actions}>
            <Button type="submit" variant="secondary" disabled={unlinking}>
              {unlinking ? "해제하는 중…" : "연결 해제"}
            </Button>
          </div>
        </form>
      )}
    </Section>
  );
}
