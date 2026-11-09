"""LLM이 제안한 묶음을 검증하는 로직 테스트.

Claude는 가끔 없는 ID를 지어내거나, 리뷰를 빠뜨리거나, 같은 ID를 두 번 넣는다.
어떤 응답이 와도 "모든 리뷰가 정확히 반영되고, 없는 리뷰는 나타나지 않는다"를 보장해야 한다.
"""

from __future__ import annotations

from review_analysis.domain.clustering import LEFTOVER_KEY, ClusteringOptions, build_clusters
from review_analysis.domain.models import Cluster, Feedback, ProposedGroup


def _feedbacks(*contents: str) -> list[Feedback]:
    return [
        Feedback(feedback_id=i + 1, user_id=(i % 3) + 1, content=c) for i, c in enumerate(contents)
    ]


FEEDBACKS = _feedbacks("로그인 오류", "로그인 실패", "로그인 안됨", "사진 깨짐", "결제 오류")


def _build(*groups: tuple[int, ...], rep: int | None = None, max_groups: int = 10) -> list[Cluster]:
    proposals = [ProposedGroup(feedback_ids=g, representative_feedback_id=rep) for g in groups]
    options = ClusteringOptions(max_groups=max_groups, samples_per_group=3)
    return build_clusters(FEEDBACKS, proposals, options)


def _ids(cluster: Cluster) -> list[int]:
    return [m.feedback_id for m in cluster.members]


def test_valid_proposal_is_kept_in_size_order() -> None:
    clusters = _build((4,), (1, 2, 3), (5,))
    assert [_ids(c) for c in clusters] == [[1, 2, 3], [4], [5]]


def test_hallucinated_ids_are_dropped() -> None:
    (cluster, *_) = _build((1, 2, 999, -1))
    assert _ids(cluster) == [1, 2]


def test_group_with_only_unknown_ids_is_removed() -> None:
    clusters = _build((998, 999), (1, 2, 3, 4, 5))
    assert len(clusters) == 1


def test_duplicate_ids_in_group_are_deduplicated() -> None:
    (cluster, *_) = _build((1, 1, 2, 2))
    assert _ids(cluster) == [1, 2]


def test_missing_feedbacks_go_to_unclassified() -> None:
    clusters = _build((1, 2))
    leftover = clusters[-1]
    assert leftover.key == LEFTOVER_KEY
    assert leftover.is_leftover
    assert _ids(leftover) == [3, 4, 5]


def test_no_unclassified_group_when_everything_assigned() -> None:
    clusters = _build((1, 2, 3), (4, 5))
    assert not any(c.is_leftover for c in clusters)


def test_empty_proposal_puts_everything_in_unclassified() -> None:
    (cluster,) = _build()
    assert cluster.is_leftover
    assert _ids(cluster) == [1, 2, 3, 4, 5]


def test_feedback_may_belong_to_multiple_groups() -> None:
    clusters = _build((1, 4), (4, 5), (2, 3))
    assert sum(4 in _ids(c) for c in clusters) == 2


def test_groups_over_limit_fall_into_unclassified() -> None:
    clusters = _build((1, 2), (3,), (4,), (5,), max_groups=2)
    assert len(clusters) == 3
    assert _ids(clusters[-1]) == [4, 5]


def test_representative_must_be_a_member() -> None:
    (cluster, *_) = _build((1, 2), rep=5)
    assert cluster.representative.feedback_id == 1


def test_valid_representative_is_kept() -> None:
    (cluster, *_) = _build((1, 2, 3), rep=3)
    assert cluster.representative.feedback_id == 3
    assert cluster.prompt_samples[0].feedback_id == 3


def test_tester_count_ignores_duplicate_users() -> None:
    feedbacks = [
        Feedback(feedback_id=1, user_id=7, content="a"),
        Feedback(feedback_id=2, user_id=7, content="b"),
        Feedback(feedback_id=3, user_id=8, content="c"),
    ]
    (cluster,) = build_clusters(
        feedbacks, [ProposedGroup(feedback_ids=(1, 2, 3))], ClusteringOptions()
    )
    assert cluster.tester_count == 2


def test_prompt_samples_prefer_longer_reviews() -> None:
    feedbacks = [
        Feedback(feedback_id=1, user_id=1, content="짧음"),
        Feedback(feedback_id=2, user_id=2, content="조금 더 긴 리뷰"),
        Feedback(feedback_id=3, user_id=3, content="가장 길고 재현 단서가 들어 있는 리뷰입니다"),
    ]
    proposals = [ProposedGroup(feedback_ids=(1, 2, 3), representative_feedback_id=1)]
    (cluster,) = build_clusters(feedbacks, proposals, ClusteringOptions(samples_per_group=2))
    assert [s.feedback_id for s in cluster.prompt_samples] == [1, 3]
