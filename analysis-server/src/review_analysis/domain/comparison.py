"""버전 비교 결과 정리.

LLM에게는 "어떤 그룹끼리 같은 문제인지(매칭)"와 "요약 문장"만 맡기고,
'신규 / 이번에 보고되지 않음' 목록은 코드가 집합 연산으로 계산한다.
LLM이 없는 ID를 지어내거나 같은 그룹을 두 번 매칭해도 여기서 걸러진다.
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
    prev_ids = {g.group_id for g in previous.groups}
    curr_ids = {g.group_id for g in current.groups}

    accepted: list[GroupMatch] = []
    seen_current: set[int] = set()
    dropped = 0
    for match in proposed:
        valid = (
            match.current_group_id in curr_ids
            and match.previous_group_id in prev_ids
            and match.current_group_id not in seen_current  # 현재 그룹은 이전 그룹 1개에만 연결
        )
        if not valid:
            dropped += 1
            continue
        seen_current.add(match.current_group_id)
        accepted.append(match)

    # 이전 그룹 하나가 현재 그룹 여러 개로 쪼개지는 것은 허용한다(문제가 세분화된 경우).
    matched_prev = {m.previous_group_id for m in accepted}
    return ComparisonResult(
        matches=tuple(sorted(accepted, key=lambda m: m.current_group_id)),
        new_group_ids=tuple(sorted(curr_ids - seen_current)),
        not_reported_group_ids=tuple(sorted(prev_ids - matched_prev)),
        summary=summary,
        dropped_match_count=dropped,
    )
