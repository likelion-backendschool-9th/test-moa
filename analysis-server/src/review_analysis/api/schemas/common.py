"""API 요청/응답 스키마 공통 설정.

- JSON 필드는 camelCase: 메인 백엔드(Spring/Jackson)의 기본 규칙과 맞춘다.
  파이썬 코드 안에서는 snake_case를 그대로 쓴다.
- ``extra="forbid"``: 계약에 없는 필드가 오면 거부해서, 양쪽 계약이 어긋난 걸 즉시 발견한다.
- ``frozen=True``: 받은 요청을 서비스 코드에서 몰래 수정하지 못하게 한다.
- API 스키마(DTO)와 도메인 모델을 분리: API 계약이 바뀌어도 도메인 로직은 영향받지 않는다.
"""

from __future__ import annotations

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from pydantic.alias_generators import to_camel

from review_analysis.domain.models import ProjectContext

MAX_FEEDBACK_CHARS = 4000

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
ShortStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
LongStr = Annotated[str, StringConstraints(strip_whitespace=True, max_length=5000)]
PositiveId = Annotated[int, Field(gt=0)]


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        validate_by_name=True,
        validate_by_alias=True,
        serialize_by_alias=True,
        frozen=True,
        extra="forbid",
    )


class ProjectContextIn(ApiModel):
    project_title: ShortStr
    project_description: LongStr | None = None
    recruitment_title: ShortStr
    recruitment_description: LongStr | None = None
    version: Annotated[int, Field(ge=1)]

    def to_domain(self) -> ProjectContext:
        return ProjectContext(
            project_title=self.project_title,
            project_description=self.project_description,
            recruitment_title=self.recruitment_title,
            recruitment_description=self.recruitment_description,
            version=self.version,
        )
