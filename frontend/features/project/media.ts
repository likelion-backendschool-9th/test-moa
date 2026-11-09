import { PROJECT_MEDIA_LIMIT } from "@/features/project/types";

/*
 * 프로젝트 이미지 검사. 화면(파일을 고를 때)과 서버(제출할 때)가 같은 규칙을 쓴다.
 * 새 파일은 제출할 때 Route Handler로 보내고, 저장 API에는 반환된 주소만 보낸다.
 */

/** 고른 파일의 이름·크기·형식 */
export type FileMeta = { name: string; size: number; type: string };

const MB = 1024 * 1024;

/** 1536 → "1.5KB", 2097152 → "2MB" */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < MB) return `${Math.round((bytes / 1024) * 10) / 10}KB`;
  return `${Math.round((bytes / MB) * 10) / 10}MB`;
}

/** 이미지 목록이 한도 안인지. 문제가 있으면 안내 문구를 돌려준다 */
export function checkImages(files: FileMeta[], count: number = PROJECT_MEDIA_LIMIT.images.count): string | undefined {
  const { bytes, types } = PROJECT_MEDIA_LIMIT.images;
  if (files.length > count) return `이미지는 ${count}장까지 올릴 수 있어요`;
  if (files.some((file) => !(types as readonly string[]).includes(file.type))) return "PNG, JPG, WEBP 이미지만 올릴 수 있어요";
  if (files.some((file) => file.size > bytes)) return `이미지는 ${formatBytes(bytes)}까지 올릴 수 있어요`;
}

/** http(s) 주소인지. 폼 검증과 미리보기가 같이 쓴다 */
export function isHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** 폼에 숨겨 보낸 파일 정보(JSON)를 읽는다. 모양이 다르면 null */
export function parseFileMeta(raw: unknown): FileMeta[] | null {
  try {
    const parsed: unknown = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(parsed)) return null;
    const ok = parsed.every(
      (item) => typeof item?.name === "string" && typeof item?.size === "number" && typeof item?.type === "string",
    );
    return ok ? (parsed as FileMeta[]) : null;
  } catch {
    return null;
  }
}

/** 업로드 API가 돌려주는 공개 이미지 주소 모양. */
export function isUploadedImageUrl(value: string) {
  return /^\/api\/v1\/recruitments\/images\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/.test(value);
}

export type UploadImage = FileMeta & { url: string; file?: File };

/** 한 장씩 올린다. 성공한 파일의 주소는 폼 수명 동안 남겨 실패 후 재제출에서도 재사용한다. */
export async function uploadImages(images: UploadImage[], endpoint: string, uploaded: WeakMap<File, string>): Promise<string[]> {
  const urls: string[] = [];
  for (const image of images) {
    if (!image.file) {
      urls.push(image.url);
      continue;
    }
    let url = uploaded.get(image.file);
    if (!url) {
      const body = new FormData();
      body.set("file", image.file);
      let response: Response;
      try {
        response = await fetch(endpoint, { method: "POST", body });
      } catch {
        throw new Error("이미지를 올리지 못했어요. 다시 시도해 주세요");
      }
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(response.status === 413 ? "이미지는 5MB까지 올릴 수 있어요" : json?.error?.fields?.file ?? json?.error?.message ?? "이미지를 올리지 못했어요. 다시 시도해 주세요");
      }
      const returned: unknown = json?.data?.url;
      if (typeof returned !== "string" || !isUploadedImageUrl(returned)) throw new Error("이미지 주소를 받지 못했어요. 다시 시도해 주세요");
      url = returned;
      uploaded.set(image.file, url);
    }
    urls.push(url);
  }
  return urls;
}

/** 서버 액션에는 파일 대신 주소 목록만 전달한다. */
export function parseImageUrls(raw: FormDataEntryValue | null): string[] | null {
  try {
    const urls: unknown = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(urls) && urls.every((url) => typeof url === "string") ? urls : null;
  } catch {
    return null;
  }
}
