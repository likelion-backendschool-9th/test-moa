"""도메인 모델.

- 모두 ``frozen=True``(불변): 만들어진 뒤 값이 바뀌지 않으므로, 여러 비동기 작업에서
  공유해도 안전하고 "어디서 값이 바뀌었지?"를 추적할 일이 없다.
  (Spring 엔티티에 무분별한 Setter를 열어두지 않는 것과 같은 이유)
- 값을 바꿔야 하면 ``dataclasses.replace``로 새 객체를 만든다.
- HTTP·DB·LLM SDK를 전혀 모르는 순수 파이썬 객체다.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from review_analysis.domain.enums import Category, Severity


@dataclass(frozen=True, slots=True, kw_only=True)
class ProjectContext:
    """프롬프트에 넣을 맥락. 프로젝트/모집글(=버전) 정보."""

    project_title: str
    project_description: str | None = None
    recruitment_title: str
    recruitment_description: str | None = None
    version: int


@dataclass(frozen=True, slots=True, kw_only=True)
class Feedback:
    feedback_id: int
    user_id: int
    content: str
    test_item_title: str | None = None


@dataclass(frozen=True, slots=True, kw_only=True)
class ProposedGroup:
    """LLM이 제안한 묶음. 아직 검증 전이라 없는 ID나 중복이 섞여 있을 수 있다."""

    feedback_ids: tuple[int, ...]
    representative_feedback_id: int | None = None


@dataclass(frozen=True, slots=True, kw_only=True)
class Cluster:
    """검증을 거친 리뷰 그룹 (아직 이름·카테고리 없음)."""

    key: str
    members: tuple[Feedback, ...]
    representative: Feedback
    prompt_samples: tuple[Feedback, ...]
    # 어느 그룹에도 들어가지 않은 리뷰를 담는 버킷. LLM 라벨링 없이 UNCLASSIFIED로 확정된다.
    is_leftover: bool = False

    @property
    def tester_count(self) -> int:
        return len({m.user_id for m in self.members})


@dataclass(frozen=True, slots=True, kw_only=True)
class GroupLabel:
    """LLM이 그룹에 붙인 해석. 생성 시점에 도메인 규칙을 강제한다."""

    name: str
    category: Category
    severity: Severity | None = None
    issue_title: str | None = None
    issue_body: str | None = None

    def __post_init__(self) -> None:
        if self.category.is_issue:
            if self.severity is None or not self.issue_title or not self.issue_body:
                msg = f"{self.category} 그룹은 심각도와 이슈 제목/내용이 필요합니다"
                raise ValueError(msg)
        elif any(v is not None for v in (self.severity, self.issue_title, self.issue_body)):
            msg = f"{self.category} 그룹은 심각도·이슈를 가질 수 없습니다"
            raise ValueError(msg)

    @classmethod
    def unclassified(cls, name: str = "미분류") -> GroupLabel:
        return cls(name=name, category=Category.UNCLASSIFIED)


@dataclass(frozen=True, slots=True, kw_only=True)
class AnalyzedGroup:
    key: str
    label: GroupLabel
    feedback_ids: tuple[int, ...]
    representative_feedback_id: int


@dataclass(frozen=True, slots=True, kw_only=True)
class AnalysisResult:
    groups: tuple[AnalyzedGroup, ...]
    # 리뷰 전체를 한 문장으로 요약한 분석. 의미 있는 그룹이 없거나 요약 응답이 이상하면 None
    analytics_summary: str | None
    praise_summary: str | None


# ───────────────────────── 버전 비교 ─────────────────────────


@dataclass(frozen=True, slots=True, kw_only=True)
class GroupSnapshot:
    """이미 DB에 저장된 그룹(실제 cluster_group_id 보유)."""

    group_id: int
    name: str
    category: Category
    severity: Severity | None
    sample: str | None = None


@dataclass(frozen=True, slots=True, kw_only=True)
class VersionSnapshot:
    version: int
    groups: tuple[GroupSnapshot, ...]


@dataclass(frozen=True, slots=True, kw_only=True)
class GroupMatch:
    current_group_id: int
    previous_group_id: int


@dataclass(frozen=True, slots=True, kw_only=True)
class ComparisonResult:
    matches: tuple[GroupMatch, ...]
    new_group_ids: tuple[int, ...]
    not_reported_group_ids: tuple[int, ...]
    summary: str
    dropped_match_count: int = field(default=0)  # LLM이 낸 잘못된 매칭 수(모니터링용)
