import styles from "./SavedNotice.module.css";
/* 폼 저장 뒤 이동한 화면 위에 띄우는 안내. URL의 notice=saved로 켠다 */

/** 저장 안내. 목업이라 실제로 저장되지 않는다는 것을 함께 알린다 */
export function SavedNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p role="status" className={styles.root}>
      저장했어요. 시연용이라 실제로 저장되지는 않아요.
    </p>
  );
}
