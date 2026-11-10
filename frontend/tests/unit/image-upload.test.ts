import { expect, test } from "@playwright/test";
import { uploadImages, type UploadImage } from "@/features/project/media";

test("#191-S19 두 번째 업로드 실패 후 재시도하면 이미 올린 첫 파일은 다시 보내지 않는다", async () => {
  const endpoint = "/api/v1/developer/recruitments/images";
  const first = new File(["first"], "first.png", { type: "image/png" });
  const second = new File(["second"], "second.png", { type: "image/png" });
  const images: UploadImage[] = [first, second].map((file) => ({
    name: file.name, size: file.size, type: file.type, file, url: `blob:${file.name}`,
  }));
  const uploaded = new WeakMap<File, string>();
  const firstUrl = "/api/v1/recruitments/images/00000000-0000-0000-0000-000000000001.png";
  const secondUrl = "/api/v1/recruitments/images/00000000-0000-0000-0000-000000000002.png";
  const sent: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    expect(input).toBe(endpoint);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    const file = (init?.body as FormData).get("file") as File;
    sent.push(file.name);
    if (sent.length === 2) {
      return Response.json({ error: { fields: { file: "두 번째 이미지 업로드 실패" } } }, { status: 500 });
    }
    return Response.json({ data: { url: file.name === first.name ? firstUrl : secondUrl } });
  };
  try {
    await expect(uploadImages(images, endpoint, uploaded)).rejects.toThrow("두 번째 이미지 업로드 실패");
    expect(sent).toEqual(["first.png", "second.png"]);
    expect(uploaded.get(first)).toBe(firstUrl);
    expect(uploaded.has(second)).toBe(false);

    await expect(uploadImages(images, endpoint, uploaded)).resolves.toEqual([firstUrl, secondUrl]);
    expect(sent).toEqual(["first.png", "second.png", "second.png"]);
    expect(uploaded.get(second)).toBe(secondUrl);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
