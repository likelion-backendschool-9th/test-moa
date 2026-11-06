import { checkImages, parseFileMeta } from "@/features/project/media";

/*
 * 개발자 프로젝트 영역의 타입과 상수.
 * 서버와 클라이언트 컴포넌트가 함께 쓰므로 서버 전용 코드를 넣지 않는다.
 */

/** 프로젝트. 테스트받을 소프트웨어 하나 (GLOSSARY: 프로젝트) */
export type Project = {
  /** URL의 projectKey */
  key: string;
  name: string;
  /** 상세 설명. 없으면 빈 문자열 */
  description: string;
  /** 대표 이미지 (백엔드 project.image_url). 없으면 null이고 화면에는 기본 이미지가 나온다 */
  image: ProjectImage | null;
  createdAt: string;
};

export type ProjectImage = { url: string; name: string; };

/** 대표 이미지를 넣지 않은 프로젝트에 보여 주는 이미지 */
export const DEFAULT_PROJECT_IMAGE_URL = "/sample/projects/default.svg";

/** 프로젝트 등록 폼의 이미지·설명 한도 */
export const PROJECT_MEDIA_LIMIT = {
  images: { count: 1, bytes: 5 * 1024 * 1024, types: ["image/png", "image/jpeg", "image/webp"] },
  descriptionLength: 2000,
} as const;

/** 폼 제출 결과. 오류가 있으면 입력값을 그대로 돌려줘 다시 채운다 */
export type FormState = {
  values: Record<string, string>;
  errors: Record<string, string>;
};

export const EMPTY_FORM_STATE: FormState = { values: {}, errors: {} };

/* ---------- 폼 검증 ---------- */

/* 브라우저는 폼을 보낼 때 줄바꿈을 두 글자(\r\n)로 바꾼다. 화면에서 센 글자 수와 맞도록 되돌린다 */
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").replace(/\r\n/g, "\n").trim();

/**
 * 프로젝트 등록·수정 폼 검증. 대표 이미지는 선택이고, 없으면 화면에 기본 이미지가 나온다.
 * 이미지는 화면에서도 거르지만 요청은 조작될 수 있어서 여기서 다시 확인한다.
 */
export function validateProjectForm(formData: FormData): FormState {
  const values = {
    name: text(formData, "name"),
    description: text(formData, "description"),
  };
  const errors: Record<string, string> = {};
  if (!values.name) errors.name = "프로젝트 이름을 적어 주세요";
  else if (values.name.length > 50) errors.name = "이름은 50자까지 적을 수 있어요";
  if (values.description.length > PROJECT_MEDIA_LIMIT.descriptionLength) {
    errors.description = `상세 설명은 ${PROJECT_MEDIA_LIMIT.descriptionLength}자까지 적을 수 있어요`;
  }

  const images = parseFileMeta(formData.get("imagesMeta"));
  const imageError = images ? checkImages(images) : "이미지 정보를 읽지 못했어요";
  if (imageError) errors.images = imageError;
  return { values, errors };
}
