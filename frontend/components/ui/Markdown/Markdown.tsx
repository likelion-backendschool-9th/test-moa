import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/cn";
import styles from "./Markdown.module.css";

/** 마크다운 글. HTML 태그는 글자 그대로 보여 주고(react-markdown 기본), 링크는 새 탭에서 연다 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn(styles.root, className)}>
      <ReactMarkdown
        components={{ a: ({ href, children: label }) => (<a href={href} target="_blank" rel="noopener noreferrer nofollow">{label}</a>) }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
