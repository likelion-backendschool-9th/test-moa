/*
 * 이미지 업로드. 프로젝트와 참여가 함께 쓴다.
 * 한 장씩 Route Handler에 보내고, 저장 API에는 반환된 주소만 넘긴다.
 * 주소 모양은 기능마다 달라서 호출하는 쪽이 검사한다.
 */

type FileMeta = { name: string; size: number; type: string };

export type UploadImage = FileMeta & { url: string; file?: File };

/** 한 장씩 올린다. 성공한 파일의 주소는 폼 수명 동안 남겨 실패 후 재제출에서도 재사용한다. */
export async function uploadImages(
  images: UploadImage[],
  endpoint: string,
  uploaded: WeakMap<File, string>,
  isValidUrl: (value: string) => boolean,
): Promise<string[]> {
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
      if (typeof returned !== "string" || !isValidUrl(returned)) throw new Error("이미지 주소를 받지 못했어요. 다시 시도해 주세요");
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
