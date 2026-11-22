"""버전 비교 결과 정리.

LLM에게는 "어떤 그룹끼리 같은 문제인지(매칭)"와 "요약 문장"만 맡기고,
'신규 / 이번에 보고되지 않음' 목록은 코드가 집합 연산으로 계산한다.
LLM이 없는 ID를 지어내거나 같은 짝을 두 번 내도 여기서 걸러진다.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from review_analysis.domain.models import ComparisonResult, GroupMatch, VersionSnapshot

if TYPE_CHECKING:
    from collections.abc import Iterable


def reconcile(
    previous: VersionSnapshot,
    current: VersionSnapshot,
    proposed: Iterable[GroupMatch],
    summary: str,
) -> ComparisonResult:
    """짝은 N:M이다 (#284).

    이전 그룹 하나가 현재 그룹 여러 개로 나뉘거나(문제가 세분화), 이전 그룹 여러 개가
    현재 그룹 하나로 합쳐질 수 있다(묶는 기준이 넓어짐). 개발자가 고친 현재 그룹
    (``fixed_previous_group_ids``)은 그 짝을 그대로 쓰고 LLM이 낸 짝은 버린다.
    """
    prev_ids = {g.group_id for g in previous.groups}
    curr_ids = {g.group_id for g in current.groups}
    fixed = {
        g.group_id: g.fixed_previous_group_ids
        for g in current.groups
        if g.fixed_previous_group_ids is not None
    }

    # 같은 짝은 한 번만. 고정 짝을 먼저 넣는다
    pairs: dict[tuple[int, int], GroupMatch] = {}
    for current_id, previous_ids in fixed.items():
        for previous_id in previous_ids:
            if previous_id in prev_ids:
                pairs.setdefault(
                    (current_id, previous_id),
                    GroupMatch(current_group_id=current_id, previous_group_id=previous_id),
                )

    dropped = 0
    for match in proposed:
        if match.current_group_id in fixed:
            continue  # 개발자가 정한 짝은 LLM이 바꾸지 않는다
        if match.current_group_id not in curr_ids or match.previous_group_id not in prev_ids:
            dropped += 1
            continue
        pairs.setdefault((match.current_group_id, match.previous_group_id), match)

    matches = sorted(pairs.values(), key=lambda m: (m.current_group_id, m.previous_group_id))
    return ComparisonResult(
        matches=tuple(matches),
        new_group_ids=tuple(sorted(curr_ids - {m.current_group_id for m in matches})),
        not_reported_group_ids=tuple(sorted(prev_ids - {m.previous_group_id for m in matches})),
        summary=summary,
        dropped_match_count=dropped,
    )
