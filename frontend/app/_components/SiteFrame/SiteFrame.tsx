import { AppFooter } from "@/app/_components/AppFooter/AppFooter";
import type { ReactNode } from "react";
import { Main } from "../Main/Main";

/** 일반 화면과 404가 공유하는 본문·푸터. */
export function SiteFrame({ children }: { children: ReactNode }) {
  return <><Main>{children}</Main><AppFooter /></>;
}
