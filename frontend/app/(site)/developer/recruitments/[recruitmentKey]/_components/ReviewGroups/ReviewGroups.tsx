"use client";

import { ArrowRightIcon, GithubLogoIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { Card } from "@/components/ui/Card/Card";
import { LinkButton } from "@/components/ui/LinkButton/LinkButton";
import { registerIssueAction, saveIssueDraftAction } from "@/features/recruitment/actions";
import { formatDateTime } from "@/lib/format";
import {
  REVIEW_CATEGORY_LABEL,
  REVIEW_SEVERITY_LABEL,
  validateIssueDraft,
  type GithubIssue,
  type ReviewGroupView,
} from "@/features/recruitment/types";
import { SeverityTag } from "../SeverityTag/SeverityTag";
import styles from "./ReviewGroups.module.css";

/*
 * 그룹 목록과 분류된 리뷰 목록. 넓은 화면에서는 왼쪽에 그룹 목록, 오른쪽에 고른 그룹의 리뷰와 이슈 초안을 두고, 목록은 오른쪽을 읽는 동안 따라 내려온다.
 * 목록은 심각도 순으로 받은 그대로 모두 보여 주고, 누르면 오른쪽이 그 그룹으로 바뀐다. 처음에는 1위 그룹을 보여 준다.
 * 오른쪽은 그룹에 묶인 리뷰를 먼저 읽고, 그 아래에서 AI가 쓴 GitHub 이슈 초안을 고치거나 등록한다.
 * 등록한 뒤에는 고칠 수 없고 GitHub의 이슈로 가는 링크만 남는다.
 * 초안 수정(PATCH .../groups/{id})과 등록(POST .../github-issue)은 서버 액션으로 백엔드에 보내고, 성공하면 화면에 반영한다.
 * shortcut: 목업(AUTH_MODE=backend가 아님)에서는 저장하지 않고 등록 번호와 주소를 시연용으로 만든다
 */

/** 처음에 펼쳐 두는 리뷰 수. 나머지는 더 보기로 연다 */
const VISIBLE_REVIEWS = 3;

type Draft = { title: string; content: string };

type ReviewGroupsProps = {
  /** 심각도 순으로 정렬한 그룹 */
  groups: ReviewGroupView[];
  /** 프로젝트에 연결한 GitHub 레포 "owner/repo". 없으면 등록할 수 없다 */
  repository?: string;
  /** 모집 건 키. 초안 저장과 이슈 등록 요청에 쓴다 */
  recruitmentKey: string;
};

type Outcome = { ok: true } | { ok: false; message: string };

export function ReviewGroups({ groups, repository, recruitmentKey }: ReviewGroupsProps) {
  const [selectedId, setSelectedId] = useState(groups[0]?.id);
  const detailRef = useRef<HTMLDivElement>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [registered, setRegistered] = useState<Record<string, GithubIssue>>({});
  const selectedIndex = Math.max(0, groups.findIndex((group) => group.id === selectedId));
  const selected = groups[selectedIndex];
  const issueOf = (group: ReviewGroupView) => registered[group.id] ?? group.issue;
  /* 시연용 등록 번호: 이미 있는 번호 다음부터 */
  const nextIssueNumber = Math.max(0, ...groups.map((group) => issueOf(group)?.number ?? 0)) + 1;

  /** 고른 그룹의 초안을 저장한다. 백엔드가 받아야 화면에 남긴다 */
  async function saveDraft(id: string, draft: Draft): Promise<Outcome> {
    const result = await saveIssueDraftAction(recruitmentKey, id, draft);
    if (result.ok) setDrafts((prev) => ({ ...prev, [id]: draft }));
    return result;
  }

  /** 고른 그룹의 이슈를 등록한다. 백엔드가 번호를 주지 않는 목업이면 시연용 번호를 만든다 */
  async function registerIssue(id: string): Promise<Outcome> {
    const result = await registerIssueAction(recruitmentKey, id);
    if (!result.ok) return result;
    const issue = result.issue ?? { number: nextIssueNumber, url: `https://github.com/${repository}/issues/${nextIssueNumber}` };
    setRegistered((prev) => ({ ...prev, [id]: issue }));
    return { ok: true };
  }

  /** 그룹을 고른다. 좁은 화면에서는 리뷰 목록이 그룹 목록 아래에 있어서 그쪽으로 내려간다 */
  function select(id: string) {
    setSelectedId(id);
    if (window.matchMedia("(min-width: 64rem)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }));
  }

  if (groups.length === 0) {
    return (
      <section aria-labelledby="review-groups-heading" className={styles.section}>
        <h2 id="review-groups-heading" className={styles.title}>
          그룹 목록
        </h2>
        <Card as="p" className={styles.empty}>
          묶인 리뷰 그룹이 없어요
        </Card>
      </section>
    );
  }

  return (
    /* 넓은 화면: 왼쪽 그룹 목록은 오른쪽을 읽는 동안 따라 내려온다 */
    <div className={styles.layout}>
      <section aria-labelledby="review-groups-heading" className={styles.listSection}>
        <div className={styles.head}>
          <h2 id="review-groups-heading" className={styles.title}>
            그룹 목록
          </h2>
          <p className={styles.note}>심각도 순</p>
        </div>
        <Card as="div" className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">심각도</th>
                <th scope="col">태그</th>
                <th scope="col" className={styles.problemCell}>
                  문제
                </th>
                <th scope="col" className={styles.number}>
                  피드백
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const isSelected = group.id === selected.id;
                return (
                  /* 줄 어디를 눌러도 고르게 하고, 키보드는 문제 이름 버튼으로 고른다 */
                  <tr key={group.id} data-selected={isSelected} onClick={() => select(group.id)} className={styles.row}>
                    <td>
                      <SeverityTag severity={group.severity} />
                    </td>
                    <td className={styles.tag}>{REVIEW_CATEGORY_LABEL[group.category]}</td>
                    <td className={styles.problemCell}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={(event) => {
                          event.stopPropagation();
                          select(group.id);
                        }}
                        className={styles.name}
                      >
                        {group.name}
                      </button>
                    </td>
                    <td className={styles.number}>
                      {/* 고른 줄은 수 대신 오른쪽(분류된 리뷰·이슈)을 가리키는 화살표. 수는 읽는 프로그램에 남긴다 */}
                      {isSelected ? (
                        <>
                          <ArrowRightIcon aria-hidden="true" weight="bold" className={styles.selectedArrow} />
                          <span className={styles.srOnly}>{group.reviews.length}건</span>
                        </>
                      ) : (
                        `${group.reviews.length}건`
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </section>

      {/* 오른쪽: AI 깃허브 이슈 생성 → 분류된 리뷰 목록 */}
      <div ref={detailRef} className={styles.detail}>
        <IssueDraft
          key={selected.id}
          draft={drafts[selected.id] ?? { title: selected.issueTitle, content: selected.issueContent }}
          issue={issueOf(selected)}
          repository={repository}
          onSave={(draft) => saveDraft(selected.id, draft)}
          onRegister={() => registerIssue(selected.id)}
        />
        <section aria-labelledby="review-issue-heading" className={styles.block}>
          <div className={styles.head}>
            <h2 id="review-issue-heading" className={styles.title}>
              분류된 리뷰 목록
            </h2>
            <p className={styles.note}>
              {REVIEW_SEVERITY_LABEL[selected.severity]} · {REVIEW_CATEGORY_LABEL[selected.category]} · 분류된 리뷰 {selected.reviews.length}건 ·
              테스터 {selected.testerCount}명
            </p>
          </div>
          <GroupReviews key={`reviews-${selected.id}`} group={selected} />
        </section>
      </div>
    </div>
  );
}

/** 고른 그룹에 묶인 리뷰. 대표 리뷰가 맨 앞이고, 처음에는 몇 개만 펼친다 */
function GroupReviews({ group }: { group: ReviewGroupView }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? group.reviews : group.reviews.slice(0, VISIBLE_REVIEWS);
  const hidden = group.reviews.length - VISIBLE_REVIEWS;
  return (
    <div className={styles.block}>
      {group.reviews.length === 0 ? (
        <p className={styles.note}>이 그룹에 남은 리뷰가 없어요</p>
      ) : (
        <ul id={`group-reviews-${group.id}`} className={styles.reviews}>
          {shown.map((review) => (
            <li key={review.id} className={styles.review}>
              <p className={styles.reviewMeta}>
                {review.representative && <span className={styles.representative}>대표 리뷰</span>}
                <strong className={styles.nickname}>{review.testerNickname}</strong>
                <span>{review.testItemTitle ?? "기타 의견"}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={review.submittedAt}>{formatDateTime(review.submittedAt)}</time>
              </p>
              <p className={styles.reviewContent}>{review.content}</p>
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <Button
          size="sm"
          variant="secondary"
          aria-expanded={expanded}
          aria-controls={`group-reviews-${group.id}`}
          onClick={() => setExpanded((value) => !value)}
          className={styles.toggle}
        >
          {expanded ? "접기" : `리뷰 ${hidden}건 더 보기`}
        </Button>
      )}
    </div>
  );
}

/** 초안 본문. AI가 마크다운의 소제목(##)과 목록(-)만 쓰므로 그 둘만 그린다 */
function IssueBody({ content }: { content: string }) {
  return (
    <div className={styles.markdown}>
      {content.split("\n\n").map((block, index) => {
        const lines = block.split("\n");
        return (
          <div key={index}>
            {lines.map((line, lineIndex) =>
              line.startsWith("## ") ? (
                <h4 key={lineIndex}>{line.slice(3)}</h4>
              ) : line.startsWith("- ") ? (
                <p key={lineIndex} className={styles.bullet}>
                  {line.slice(2)}
                </p>
              ) : (
                <p key={lineIndex}>{line}</p>
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}

type IssueDraftProps = {
  draft: Draft;
  /** 등록한 이슈. 등록 전에는 null */
  issue: GithubIssue | null;
  repository?: string;
  onSave: (draft: Draft) => Promise<Outcome>;
  onRegister: () => Promise<Outcome>;
};

/** GitHub 이슈처럼 생긴 초안. 보기·수정 두 상태가 있고, 등록하면 GitHub 이슈로 가는 링크만 남는다 */
function IssueDraft({ draft, issue, repository, onSave, onRegister }: IssueDraftProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(draft.title);
  const [content, setContent] = useState(draft.content);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [busy, setBusy] = useState(false);
  const [registerError, setRegisterError] = useState("");

  async function save() {
    const message = validateIssueDraft(title, content);
    setError(message ?? "");
    if (message) return;
    setBusy(true);
    const result = await onSave({ title: title.trim(), content });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setEditing(false);
    setAnnouncement("초안을 저장했어요");
  }

  async function register() {
    setBusy(true);
    setRegisterError("");
    const result = await onRegister();
    setBusy(false);
    if (result.ok) setAnnouncement("GitHub에 이슈를 등록했어요");
    else setRegisterError(result.message);
  }

  function cancel() {
    setTitle(draft.title);
    setContent(draft.content);
    setError("");
    setEditing(false);
  }

  return (
    <section aria-labelledby="issue-draft-heading" className={styles.block}>
      <div className={styles.head}>
        <h2 id="issue-draft-heading" className={styles.title}>
          AI 깃허브 이슈 생성
        </h2>
        <span className={styles.note}>{repository ? `연결된 레포 ${repository}` : "연결된 레포 없음"}</span>
      </div>
      <p className={styles.footnote}>AI가 정리한 내용이라 틀릴 수 있어요. 이슈 초안은 검토한 뒤 등록하세요.</p>
      <article aria-label="GitHub 이슈 초안" className={styles.draft}>
        <header className={styles.draftHeader}>
          <GithubLogoIcon aria-hidden="true" weight="fill" className={styles.githubIcon} />
          {editing ? (
            <span className={styles.draftLabel}>직접 수정하기</span>
          ) : (
            <>
              {issue && <span className={styles.stateOpen}>등록됨</span>}
              <p className={styles.issueName}>
                {draft.title}
                {issue && <span className={styles.issueNumber}> #{issue.number}</span>}
              </p>
            </>
          )}
        </header>

        {editing ? (
          <div className={styles.draftForm}>
            <label className={styles.fieldLabel} htmlFor="issue-title">
              제목
            </label>
            <input id="issue-title" value={title} maxLength={255} onChange={(event) => setTitle(event.target.value)} className={styles.input} />
            <label className={styles.fieldLabel} htmlFor="issue-content">
              내용
            </label>
            <textarea
              id="issue-content"
              value={content}
              rows={12}
              onChange={(event) => setContent(event.target.value)}
              className={styles.textarea}
            />
            <p className={styles.note}>소제목은 ## 로, 목록은 - 로 시작해요</p>
            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}
          </div>
        ) : (
          <IssueBody content={draft.content} />
        )}
      </article>

      {/* 버튼은 이슈 상자 아래 오른쪽 */}
      <div className={styles.draftActions}>
          {editing ? (
            <>
              <Button size="sm" variant="secondary" disabled={busy} onClick={cancel}>
                취소
              </Button>
              <Button size="sm" disabled={busy} onClick={save}>
                {busy ? "저장 중…" : "저장"}
              </Button>
            </>
          ) : issue ? (
            <LinkButton size="sm" href={issue.url} target="_blank" rel="noreferrer" className={styles.register}>
              <GithubLogoIcon aria-hidden="true" weight="fill" />
              등록한 이슈 보러 가기
              <span className={styles.srOnly}>(새 탭)</span>
            </LinkButton>
          ) : (
            <>
              {!repository && <p className={styles.hint}>모집 정보 탭에서 GitHub 저장소를 연결하면 등록할 수 있어요</p>}
              {registerError && (
                <p role="alert" className={styles.error}>
                  {registerError}
                </p>
              )}
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => setEditing(true)}>
                직접 수정하기
              </Button>
              <Button size="sm" disabled={!repository || busy} onClick={register} className={styles.register}>
                <GithubLogoIcon aria-hidden="true" weight="fill" />
                {busy ? "등록 중…" : "GitHub에 이슈 등록"}
              </Button>
            </>
          )}
      </div>
      <p aria-live="polite" className={styles.srOnly}>
        {announcement}
      </p>
    </section>
  );
}
