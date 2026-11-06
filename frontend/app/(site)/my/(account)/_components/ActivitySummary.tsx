import Link from "next/link";
import { participationsPath } from "@/lib/participation-paths";
import { PROJECTS_PATH } from "@/lib/project-paths";
import { LinkButton } from "@/components/ui/LinkButton";
import type { Activity } from "../../../../../features/my/types";
import { ActivityGroup } from "./ActivityGroup";
import { cardClass, cardTitleClass } from "./card-styles";

type Stat = { label: string; count: number; href: string };

/** 테스트 참여와 내 프로젝트를 한 카드에. 한 계정이 둘 다 한다 */
export function ActivitySummary({ activity }: { activity: Activity }) {
  const { participation, project } = activity;
  const participationStats: Stat[] = [
    { label: "지원", count: participation.applied, href: participationsPath("applied") },
    { label: "참여 중", count: participation.ongoing, href: participationsPath("ongoing") },
    { label: "완료", count: participation.completed, href: participationsPath("history") },
  ];
  const projectStats: Stat[] = [
    { label: "프로젝트", count: project.projects, href: PROJECTS_PATH },
    { label: "모집 중", count: project.recruiting, href: PROJECTS_PATH },
    { label: "새 피드백", count: project.newFeedback, href: PROJECTS_PATH },
  ];
  return (
    <section aria-labelledby="my-activity-heading" className={cardClass}>
      <h2 id="my-activity-heading" className={cardTitleClass}>
        활동 요약
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <ActivityGroup kind="participation">
          <StatList stats={participationStats} />
        </ActivityGroup>
        <ActivityGroup kind="project">
          {project.projects > 0 ? (
            <StatList stats={projectStats} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted px-4 py-3">
              <p className="text-sm text-text-muted">아직 등록한 프로젝트가 없어요</p>
              <LinkButton href={PROJECTS_PATH} variant="secondary" size="sm">
                내 프로젝트
              </LinkButton>
            </div>
          )}
        </ActivityGroup>
      </div>
    </section>
  );
}

function StatList({ stats }: { stats: Stat[] }) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <li key={stat.label}>
          <Link
            href={stat.href}
            aria-label={`${stat.label} ${stat.count}`}
            className="flex flex-col gap-1 rounded-lg bg-surface-muted px-3 py-3 transition-colors duration-300 ease-brand hover:bg-surface-strong"
          >
            <span className="text-xs text-text-muted">{stat.label}</span>
            <span className="text-xl font-extrabold tabular-nums">{stat.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
