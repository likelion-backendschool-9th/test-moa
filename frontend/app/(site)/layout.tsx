import { SiteFrame } from "@/app/_components/SiteFrame";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <SiteFrame>{children}</SiteFrame>;
}
