import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/Button/Button";
import { cn } from "@/lib/cn";
import styles from "./GalleryNavButton.module.css";

/** 모집 갤러리와 테스트 항목 이미지 보기가 함께 쓰는 이전·다음 버튼 */
export function GalleryNavButton({ direction, className, ...props }: { direction: "prev" | "next" } & Omit<ComponentProps<typeof Button>, "variant" | "size" | "children">) {
  const prev = direction === "prev";
  const Icon = prev ? CaretLeftIcon : CaretRightIcon;
  return (
    <Button {...props} variant="ghost" size="sm" aria-label={prev ? "이전 이미지" : "다음 이미지"} className={cn(styles.root, prev ? styles.prev : styles.next, className)}>
      <Icon aria-hidden size={16} weight="bold" />
    </Button>
  );
}
