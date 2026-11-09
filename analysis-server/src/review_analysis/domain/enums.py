"""DB(메인 백엔드)와 반드시 값이 일치해야 하는 열거형.

값을 바꾸면 메인 백엔드의 Enum과 DB 데이터도 함께 바꿔야 한다.
"""

from __future__ import annotations

from enum import IntEnum, StrEnum


class Category(StrEnum):
    """cluster_group.category"""

    BUG = "BUG"
    UX = "UX"
    REQUEST = "REQUEST"
    PRAISE = "PRAISE"
    UNCLASSIFIED = "UNCLASSIFIED"

    @property
    def is_issue(self) -> bool:
        """GitHub 이슈로 등록할 수 있는 카테고리인가."""
        return self in {Category.BUG, Category.UX, Category.REQUEST}


class Severity(IntEnum):
    """cluster_group.improvement_rank — 숫자가 작을수록 먼저 확인해야 한다."""

    CRITICAL = 1  # 치명: 크래시, 데이터 손실, 결제·보안 문제
    BLOCKER = 2  # 차단: 기능을 사용할 수 없음, 진행이 막힘
    MINOR = 3  # 불편: 우회 가능하지만 번거로움
    TRIVIAL = 4  # 사소: 문구, 색상, 취향
