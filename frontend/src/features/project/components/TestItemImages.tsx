import type { TestItem } from "../types";

/** 테스트 항목 설명을 돕는 이미지. 정한 순서대로 나열하고 넘치면 다음 줄로 내린다 */
export function TestItemImages({ item }: { item: TestItem }) {
  if (item.images.length === 0) return null;
  return (
    <ul aria-label={`${item.title} 이미지 ${item.images.length}장`} data-testid="test-item-images" className="flex flex-wrap gap-2">
      {item.images.map((image) => (
        <li key={image.url}>
          {/* 등록 중인 이미지와 샘플을 같은 방식으로 보여 준다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.name} className="size-24 rounded-xl bg-surface-muted object-cover outline -outline-offset-1 outline-line" />
        </li>
      ))}
    </ul>
  );
}
