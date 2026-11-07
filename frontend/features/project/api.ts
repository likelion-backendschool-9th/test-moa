import { getDemoDataMode, waitIfSlow } from "@/demo/mode";
import { buildProjectRecords } from "@/demo/project";
import { requireRole } from "@/features/session/guard";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import "server-only";

/** 프로젝트의 존재와 소유자만 확인한다. 모집 목록이나 처리 기록은 읽지 않는다. */
export async function getOwnedProject(path: string, projectKey: string) {
  const role = await requireRole(path);
  await waitIfSlow();
  await connection();
  if (role !== "developer" || (await getDemoDataMode()) === "empty") notFound();
  const project = buildProjectRecords(new Date()).find(item => item.key === projectKey);
  if (!project) notFound();
  return project;
}
