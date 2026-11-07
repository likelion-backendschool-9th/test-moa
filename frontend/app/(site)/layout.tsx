import { SiteFrame } from "@/app/_components/SiteFrame/SiteFrame";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <SiteFrame>{children}</SiteFrame>;
}
