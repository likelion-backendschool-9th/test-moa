import { expect, test } from "@playwright/test";
import { isDeveloperFeedbackImageUrl, isFeedbackImageUrl } from "@/features/participation/feedback-images";
import { isUploadedImageUrl } from "@/features/project/media";
import { uploadImages, type UploadImage } from "@/lib/image-upload";

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
    await expect(uploadImages(images, endpoint, uploaded, isUploadedImageUrl)).rejects.toThrow("두 번째 이미지 업로드 실패");
    expect(sent).toEqual(["first.png", "second.png"]);
    expect(uploaded.get(first)).toBe(firstUrl);
    expect(uploaded.has(second)).toBe(false);

    await expect(uploadImages(images, endpoint, uploaded, isUploadedImageUrl)).resolves.toEqual([firstUrl, secondUrl]);
    expect(sent).toEqual(["first.png", "second.png", "second.png"]);
    expect(uploaded.get(second)).toBe(secondUrl);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("#57-S13 피드백 이미지 주소만 받고 다른 모양은 거절한다", async () => {
  const uuid = "00000000-0000-0000-0000-000000000001";
  const endpoint = "/api/v1/tester/participations/7/feedbacks/images";
  const feedbackUrl = `${endpoint}/${uuid}.png`;
  const publicUrl = `/api/v1/recruitments/images/${uuid}.png`;
  const file = new File(["png"], "shot.png", { type: "image/png" });
  const images: UploadImage[] = [{ name: file.name, size: file.size, type: file.type, file, url: "blob:shot.png" }];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => Response.json({ data: { url: feedbackUrl } });
  try {
    await expect(uploadImages(images, endpoint, new WeakMap(), isFeedbackImageUrl)).resolves.toEqual([feedbackUrl]);
  } finally {
    globalThis.fetch = originalFetch;
  }

  globalThis.fetch = async () => Response.json({ data: { url: publicUrl } });
  try {
    await expect(uploadImages(images, endpoint, new WeakMap(), isFeedbackImageUrl)).rejects.toThrow("이미지 주소를 받지 못했어요. 다시 시도해 주세요");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const rejected = [
    `/api/v1/tester/participations/abc/feedbacks/images/${uuid}.png`,
    `/api/v1/tester/participations/7/feedbacks/images/a..png`,
    `/api/v1/tester/participations/7/feedbacks/images/${uuid}.svg`,
  ];
  for (const url of rejected) expect(isFeedbackImageUrl(url), url).toBe(false);
  const developerRejected = [
    `/api/v1/developer/feedbacks/abc/images/${uuid}.png`,
    `/api/v1/developer/feedbacks/7/images/a..png`,
    `/api/v1/developer/feedbacks/7/images/${uuid}.svg`,
  ];
  for (const url of developerRejected) expect(isDeveloperFeedbackImageUrl(url), url).toBe(false);
  expect(isFeedbackImageUrl(feedbackUrl)).toBe(true);
  expect(isDeveloperFeedbackImageUrl(`/api/v1/developer/feedbacks/7/images/${uuid}.png`)).toBe(true);
});
