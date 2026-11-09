import { AccountCard, AccountCardTitle } from "@/app/(site)/my/(account)/_components/AccountCard/AccountCard";
import { BACKEND_REPORT_STATUS_LABEL, BACKEND_REPORT_TARGET_LABEL, type MyReport } from "@/features/report/types";
import { formatDate } from "@/lib/format";
import { MyReportsDialog } from "./MyReportsDialog";
import styles from "./MyReports.module.css";

/** 카드에는 최근 몇 건만 두고, 나머지와 증거 파일은 "전체 보기" 창에서 본다 */
const PREVIEW_COUNT = 3;

/** 내가 한 신고와 처리 상태(#85). 신고당한 회원과 판정한 운영자는 보이지 않는다 */
export function MyReports({ reports }: { reports: MyReport[] }) {
  return (
    <AccountCard as="section" aria-labelledby="my-reports-heading">
      <div className={styles.head}>
        <AccountCardTitle id="my-reports-heading">내 신고</AccountCardTitle>
        {reports.length > 0 && <MyReportsDialog reports={reports} />}
      </div>
      {reports.length === 0 ? (
        <p className={styles.empty}>아직 한 신고가 없어요.</p>
      ) : (
        <ul className={styles.list}>
          {reports.slice(0, PREVIEW_COUNT).map((report) => (
            <li key={report.id} className={styles.row}>
              <div className={styles.main}>
                <span className={styles.target}>{BACKEND_REPORT_TARGET_LABEL[report.targetType]} 신고</span>
                <p className={styles.reason}>{report.reason}</p>
              </div>
              <div className={styles.meta}>
                <span className={styles.status}>{BACKEND_REPORT_STATUS_LABEL[report.status]}</span>
                <span>{formatDate(report.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountCard>
  );
}
