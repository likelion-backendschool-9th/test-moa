import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/cn";
import styles from "./Markdown.module.css";

/** 마크다운 글. HTML 태그는 글자 그대로 보여 주고(react-markdown 기본), 링크는 새 탭에서 연다. 이미지는 외부 주소를 못 넣게 뺀다(모집 이미지는 따로 올린다) */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn(styles.root, className)}>
      <ReactMarkdown
        disallowedElements={["img"]}
        components={{ a: ({ href, children: label }) => (<a href={href} target="_blank" rel="noopener noreferrer nofollow">{label}</a>) }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
