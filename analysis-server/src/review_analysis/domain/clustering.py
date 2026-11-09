"""LLM이 제안한 리뷰 묶음을 검증해 최종 그룹으로 만드는 순수 로직.

리뷰를 의미로 묶는 판단은 Claude에게 맡기고(한국어 이해가 로컬 임베딩보다 정확),
그 결과를 그대로 믿지 않고 여기서 규칙으로 검증한다.
- 존재하지 않는 리뷰 ID(지어낸 ID)는 버린다
- 어느 그룹에도 들어가지 않은 리뷰는 '미분류' 그룹에 넣는다 → 리뷰가 절대 사라지지 않는다
- 대표 리뷰가 그룹 구성원이 아니면 첫 구성원으로 대체한다
네트워크·SDK를 모르는 순수 함수라 결정적이고 단위 테스트가 쉽다.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import TYPE_CHECKING

from review_analysis.domain.models import Cluster

if TYPE_CHECKING:
    from collections.abc import Sequence

    from review_analysis.domain.models import Feedback, ProposedGroup

LEFTOVER_KEY = "g_unclassified"


@dataclass(frozen=True, slots=True, kw_only=True)
class ClusteringOptions:
    max_groups: int = 40
    samples_per_group: int = 5


def build_clusters(
    feedbacks: Sequence[Feedback],
    proposals: Sequence[ProposedGroup],
    options: ClusteringOptions,
) -> list[Cluster]:
    """LLM 제안 → 검증된 그룹 목록.

    - 리뷰 하나가 여러 그룹에 들어가는 것은 허용한다
      ("로그인도 느리고 사진도 깨져요"처럼 문제가 두 개인 리뷰).
    - 그룹이 ``options.max_groups``를 넘으면 작은 그룹의 리뷰는 미분류로 보낸다
      (그룹마다 LLM 라벨링 호출이 생기므로 호출 수를 제한하기 위함).
    """
    by_id = {f.feedback_id: f for f in feedbacks}

    valid: list[tuple[list[int], int | None]] = []
    for proposal in proposals:
        # dict.fromkeys: 순서를 유지하면서 중복 제거. 존재하지 않는 ID는 제외.
        members = [i for i in dict.fromkeys(proposal.feedback_ids) if i in by_id]
        if members:
            valid.append((members, proposal.representative_feedback_id))

    # 큰 그룹 순. 같은 크기면 첫 리뷰 ID 순으로 정렬해 결과를 안정적으로 만든다.
    valid.sort(key=lambda g: (-len(g[0]), g[0][0]))
    kept = valid[: options.max_groups]

    clusters = [
        _to_cluster(f"g{n + 1}", members, rep, by_id, options.samples_per_group)
        for n, (members, rep) in enumerate(kept)
    ]

    assigned = {i for members, _ in kept for i in members}
    leftover = [f.feedback_id for f in feedbacks if f.feedback_id not in assigned]
    if leftover:
        # 상한을 넘어 잘린 그룹의 리뷰도 assigned에 없으므로 여기 미분류로 들어간다.
        bucket = _to_cluster(LEFTOVER_KEY, leftover, None, by_id, options.samples_per_group)
        clusters.append(replace(bucket, is_leftover=True))
    return clusters


def select_prompt_samples(
    members: Sequence[Feedback], representative: Feedback, limit: int
) -> list[Feedback]:
    """그룹에서 LLM 라벨링 프롬프트에 넣을 리뷰를 최대 ``limit``개 고른다.

    대표 리뷰를 먼저 넣고, 나머지는 긴 리뷰부터 넣는다.
    긴 리뷰일수록 재현 단서(어떤 화면, 어떤 순서, 어떤 기기)가 담겨 있을 가능성이 높아
    GitHub 이슈 초안의 품질이 좋아진다.
    """
    others = sorted(
        (m for m in members if m.feedback_id != representative.feedback_id),
        key=lambda m: (-len(m.content), m.feedback_id),
    )
    return [representative, *others][:limit]


def _to_cluster(
    key: str,
    member_ids: list[int],
    representative_id: int | None,
    by_id: dict[int, Feedback],
    samples_per_group: int,
) -> Cluster:
    members = tuple(by_id[i] for i in member_ids)
    # 대표 리뷰는 반드시 그룹에 속한 "실제" 리뷰여야 한다. 아니면 첫 구성원으로 대체.
    rep_id = representative_id if representative_id in member_ids else member_ids[0]
    representative = by_id[rep_id]
    return Cluster(
        key=key,
        members=members,
        representative=representative,
        prompt_samples=tuple(select_prompt_samples(members, representative, samples_per_group)),
    )
