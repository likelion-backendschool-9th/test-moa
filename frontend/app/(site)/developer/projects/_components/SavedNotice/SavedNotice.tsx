import { isBackendAuth } from "@/lib/backend";
import styles from "./SavedNotice.module.css";
/* 폼 저장 뒤 이동한 화면 위에 띄우는 안내. URL의 notice=saved로 켠다. 프로젝트를 삭제하고 목록으로 오면 notice=deleted다 */

/** 저장·삭제 안내. 목업이면 저장은 실제로 되지 않고, 삭제는 이 브라우저에만 남는다는 것을 함께 알린다 */
export function SavedNotice({ show, deleted = false }: { show: boolean; deleted?: boolean }) {
  if (!show && !deleted) return null;
  const text = deleted
    ? isBackendAuth ? "프로젝트를 삭제했어요." : "프로젝트를 삭제했어요. 시연용이라 이 브라우저에만 남아요."
    : isBackendAuth ? "저장했어요." : "저장했어요. 시연용이라 실제로 저장되지는 않아요.";
  return (
    <p role="status" className={styles.root}>
      {text}
    </p>
  );
}
