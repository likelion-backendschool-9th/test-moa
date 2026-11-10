import { AdminPanel } from "@/app/(site)/admin/_components/AdminPanel/AdminPanel";
import { PlanTermsForm } from "@/app/(site)/admin/plans/_components/PlanTermsForm/PlanTermsForm";
import { Skeleton } from "@/components/ui/Skeleton/Skeleton";
import { getAdminPlans } from "@/features/subscription/api";
import styles from "./PlanTerms.module.css";

/** 무료 플랜과 지금 파는 구독 플랜마다 혜택 양식 하나 */
export async function PlanTerms() {
  const { freePlan, plans } = await getAdminPlans();
  return (
    <>
      <PlanTermsForm kind="free" title="무료 플랜" name={freePlan.name} benefits={freePlan.benefits} />
      {plans.length === 0 && (
        <AdminPanel as="section" aria-label="구독 플랜" className={styles.panel}>
          <p className={styles.hint}>지금 파는 구독 플랜이 없어요. 플랜은 API로 먼저 등록해 주세요.</p>
        </AdminPanel>
      )}
      {plans.map((plan) => (
        <PlanTermsForm key={plan.id} kind="subscription" title={`구독 플랜 ${plan.name}`} planId={plan.id} name={plan.name} benefits={plan.benefits} />
      ))}
    </>
  );
}

export function PlanTermsSkeleton() {
  return (
    <div aria-busy="true" aria-label="플랜 불러오는 중" className={styles.skeleton}>
      <Skeleton className={styles.skeletonBlock} />
      <Skeleton className={styles.skeletonBlock} />
    </div>
  );
}

/** 목업 모드의 안내. 플랜 값은 서버에 있어서 목업으로 흉내 내지 않는다 */
export function PlanMockNotice() {
  return (
    <AdminPanel as="section" aria-label="안내" className={styles.panel}>
      <p className={styles.title}>백엔드와 연결했을 때 쓸 수 있어요</p>
      <p className={styles.hint}>플랜의 혜택은 서버에 저장된 값이라, 목업에서는 고칠 수 없어요.</p>
    </AdminPanel>
  );
}
