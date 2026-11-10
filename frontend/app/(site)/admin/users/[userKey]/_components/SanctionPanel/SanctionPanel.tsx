import { Badge } from "@/components/ui/Badge/Badge";
import { FormMessage } from "@/components/ui/FormField/FormField";
import { formatDate } from "@/lib/format";
import { releaseUserSanction, sanctionUser } from "@/features/member/actions";
import type { AdminSanction } from "@/features/member/admin";
import { RESTRICTION_LABEL, SANCTION_TYPE_LABEL, type Restriction, type SanctionType } from "@/features/member/types";
import { AdminPanel } from "@/app/(site)/admin/_components/AdminPanel/AdminPanel";
import { PendingButton } from "@/app/(site)/admin/users/[userKey]/_components/PendingButton/PendingButton";
import styles from "./SanctionPanel.module.css";

/* 주소에는 키만 두고 문구는 여기서 고른다. 모르는 키는 무시한다 */
const NOTICE: Record<string, { status: "success" | "error"; text: string }> = {
  created: { status: "success", text: "제재했어요" },
  released: { status: "success", text: "제재를 해제했어요" },
  invalid: { status: "error", text: "처리하지 못했어요. 기간 정지는 기간과 막을 기능을, 영구 정지는 막을 기능을 골라 주세요" },
  inactive: { status: "error", text: "이미 풀렸거나 끝난 제재예요" },
  duplicate: { status: "error", text: "같은 종류·같은 기능의 정지가 이미 걸려 있어요" },
};

function period(sanction: AdminSanction) {
  if (sanction.type === "WARNING") return formatDate(sanction.startedAt);
  return `${formatDate(sanction.startedAt)} ~ ${sanction.endsAt ? formatDate(sanction.endsAt) : "해제할 때까지"}`;
}

/** 제재 이력과 해제, 새 제재(실제 로그인, #86). 지금 걸린 제재만 해제할 수 있다 */
export function SanctionPanel({ userKey, sanctions, notice }: { userKey: string; sanctions: AdminSanction[]; notice?: string }) {
  const message = notice && Object.hasOwn(NOTICE, notice) ? NOTICE[notice] : null;
  return (
    <>
      {message && <FormMessage status={message.status} message={message.text} />}
      <AdminPanel as="section" aria-labelledby="user-sanctions-heading">
        <h3 id="user-sanctions-heading" className={styles.title}>
          제재 이력
        </h3>
        {sanctions.length === 0 ? (
          <p className={styles.muted}>제재 이력이 없어요</p>
        ) : (
          <ul className={styles.list}>
            {sanctions.map((sanction) => (
              <li key={sanction.id} className={styles.row}>
                <div className={styles.head}>
                  <span className={styles.type}>
                    {SANCTION_TYPE_LABEL[sanction.type]}
                    {sanction.restrictions.length > 0 && ` · ${sanction.restrictions.map((r) => RESTRICTION_LABEL[r]).join(", ")} 제한`}
                  </span>
                  {sanction.active && <Badge tone="neutral">제한 중</Badge>}
                  {sanction.releasedAt && <Badge tone="muted">해제됨</Badge>}
                </div>
                <p className={styles.text}>{sanction.reason}</p>
                <p className={styles.muted}>
                  {period(sanction)}
                  {sanction.sanctionedBy && ` · ${sanction.sanctionedBy}`}
                </p>
                {sanction.releasedAt && (
                  <p className={styles.muted}>
                    해제 {formatDate(sanction.releasedAt)} · {sanction.releaseReason}
                  </p>
                )}
                {sanction.active && (
                  <form action={releaseUserSanction} className={styles.inline}>
                    <input type="hidden" name="userKey" value={userKey} />
                    <input type="hidden" name="sanctionKey" value={sanction.id} />
                    <input name="reason" required maxLength={1000} aria-label="해제 사유" placeholder="해제 사유" className={styles.input} />
                    <PendingButton size="sm" pendingText="해제하는 중…">
                      해제
                    </PendingButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <AdminPanel as="form" action={sanctionUser} aria-labelledby="sanction-form-heading">
        <h3 id="sanction-form-heading" className={styles.title}>
          제재하기
        </h3>
        <input type="hidden" name="userKey" value={userKey} />
        <div className={styles.fields}>
          <label className={styles.field}>
            종류
            <select name="type" defaultValue="WARNING" className={styles.input}>
              {(Object.keys(SANCTION_TYPE_LABEL) as SanctionType[]).map((type) => (
                <option key={type} value={type}>
                  {SANCTION_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            기간(일, 기간 정지만)
            <input type="number" name="days" min={1} max={3650} className={styles.input} />
          </label>
          <fieldset className={styles.field}>
            <legend>막을 기능(정지만)</legend>
            <div className={styles.checks}>
              {(Object.keys(RESTRICTION_LABEL) as Restriction[]).map((restriction) => (
                <label key={restriction} className={styles.check}>
                  <input type="checkbox" name="restrictions" value={restriction} />
                  {RESTRICTION_LABEL[restriction]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className={styles.field}>
            사유
            <textarea name="reason" rows={3} required maxLength={1000} className={styles.input} />
          </label>
        </div>
        <PendingButton className={styles.submit} pendingText="제재하는 중…">
          제재하기
        </PendingButton>
      </AdminPanel>
    </>
  );
}
