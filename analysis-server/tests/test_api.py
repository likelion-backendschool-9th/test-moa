from __future__ import annotations

from typing import TYPE_CHECKING, Any

import pytest

from review_analysis.core.errors import LLMOutputError, UpstreamLLMError
from review_analysis.core.security import INTERNAL_TOKEN_HEADER
from review_analysis.domain.models import GroupMatch, ProposedGroup

if TYPE_CHECKING:
    from fastapi.testclient import TestClient

    from tests.fakes import FakeLLM

CONTEXT = {
    "projectTitle": "가계부 앱",
    "recruitmentTitle": "v3 베타 테스트",
    "version": 3,
}


def _analysis_body(*contents: str) -> dict[str, Any]:
    return {
        "context": CONTEXT,
        "feedbacks": [
            {"feedbackId": i + 1, "userId": i + 1, "content": c} for i, c in enumerate(contents)
        ],
    }


class TestAuth:
    def test_missing_token_is_rejected(self, client: TestClient) -> None:
        res = client.post("/v1/analyses", json={}, headers={INTERNAL_TOKEN_HEADER: ""})
        assert res.status_code == 401

    def test_wrong_token_is_rejected(self, client: TestClient) -> None:
        res = client.post("/v1/analyses", json={}, headers={INTERNAL_TOKEN_HEADER: "x" * 32})
        assert res.status_code == 401

    def test_health_needs_no_token(self, client: TestClient) -> None:
        res = client.get("/health/live", headers={INTERNAL_TOKEN_HEADER: ""})
        assert res.status_code == 200


class TestAnalyses:
    def test_groups_and_issue_drafts(self, client: TestClient, llm: FakeLLM) -> None:
        res = client.post(
            "/v1/analyses",
            json=_analysis_body(
                "로그인 누르면 앱이 꺼져요",
                "로그인 하면 꺼짐",
                "로그인 버튼 누르면 꺼져요",
                "디자인 좋아요",
                "색감이 좋아요",
            ),
        )
        assert res.status_code == 200
        body = res.json()

        # camelCase 계약
        group = body["groups"][0]
        assert {"key", "name", "category", "improvementRank", "feedbackIds"} <= group.keys()

        bug = next(g for g in body["groups"] if g["category"] == "BUG")
        assert sorted(bug["feedbackIds"]) == [1, 2, 3]
        assert bug["improvementRank"] == 1
        assert bug["representativeFeedbackId"] in bug["feedbackIds"]
        assert bug["gitIssueTitle"]

        praise = next(g for g in body["groups"] if g["category"] == "PRAISE")
        assert praise["improvementRank"] is None
        assert praise["gitIssueTitle"] is None
        assert body["praiseSummary"]
        assert "praise" in llm.calls
        assert body["analyticsSummary"] == f"{bug['name']} 먼저 확인"
        assert "overall" in llm.calls

    def test_analytics_summary_puts_most_severe_group_first(
        self, client: TestClient, llm: FakeLLM
    ) -> None:
        # 사소한 결제 문제를 먼저 보내도, 치명(앱 종료)인 로그인 문제가 요약의 맨 앞 그룹이 된다
        res = client.post(
            "/v1/analyses",
            json=_analysis_body("결제 금액이 이상해요", "로그인 하면 꺼져요", "로그인 누르면 꺼짐"),
        )

        assert res.status_code == 200
        assert res.json()["analyticsSummary"].startswith("로그인")

    def test_bad_analytics_summary_keeps_groups(self, client: TestClient, llm: FakeLLM) -> None:
        # 한 문장 요약만 이상하면 묶은 결과는 살리고 요약만 비운다
        llm.overall_fail_with = LLMOutputError("broken")
        res = client.post("/v1/analyses", json=_analysis_body("로그인 하면 꺼져요"))

        assert res.status_code == 200
        assert res.json()["analyticsSummary"] is None
        assert res.json()["groups"]

    def test_bad_praise_summary_keeps_groups(self, client: TestClient, llm: FakeLLM) -> None:
        # 칭찬 요약만 이상하면 묶은 결과는 살리고 칭찬 요약만 비운다
        llm.praise_fail_with = LLMOutputError("broken")
        res = client.post(
            "/v1/analyses", json=_analysis_body("좋아요 마음에 들어요", "로그인 하면 꺼져요")
        )

        assert res.status_code == 200
        assert res.json()["praiseSummary"] is None
        assert res.json()["groups"]

    def test_duplicate_feedback_ids_are_rejected(self, client: TestClient) -> None:
        body = _analysis_body("a", "b")
        body["feedbacks"][1]["feedbackId"] = 1

        res = client.post("/v1/analyses", json=body)
        assert res.status_code == 422
        assert res.headers["content-type"] == "application/problem+json"
        assert res.json()["type"] == "validation-error"

    def test_unknown_field_is_rejected(self, client: TestClient) -> None:
        body = _analysis_body("로그인 오류")
        body["unexpected"] = True
        assert client.post("/v1/analyses", json=body).status_code == 422

    def test_llm_outage_returns_502(self, client: TestClient, llm: FakeLLM) -> None:
        llm.fail_with = UpstreamLLMError("down")
        res = client.post("/v1/analyses", json=_analysis_body("로그인 오류", "로그인 실패"))

        assert res.status_code == 502
        assert res.json()["type"] == "llm-upstream-error"

    def test_bad_llm_output_degrades_to_unclassified(
        self, client: TestClient, llm: FakeLLM
    ) -> None:
        llm.fail_with = LLMOutputError("broken")
        res = client.post("/v1/analyses", json=_analysis_body("로그인 오류", "로그인 실패"))

        assert res.status_code == 200
        assert all(g["category"] == "UNCLASSIFIED" for g in res.json()["groups"])

    def test_grouping_failure_fails_whole_analysis(self, client: TestClient, llm: FakeLLM) -> None:
        # 묶기는 모든 단계의 출발점이라, 실패하면 부분 결과 없이 전체를 실패시킨다(메인이 재시도).
        llm.group_fail_with = LLMOutputError("broken")
        res = client.post("/v1/analyses", json=_analysis_body("로그인 오류"))

        assert res.status_code == 502
        assert res.json()["type"] == "llm-output-invalid"

    def test_hallucinated_and_missing_ids_are_handled(
        self, client: TestClient, llm: FakeLLM
    ) -> None:
        llm.proposed_groups = [ProposedGroup(feedback_ids=(1, 2, 999))]  # 999는 없는 ID, 3은 누락
        res = client.post(
            "/v1/analyses", json=_analysis_body("로그인 오류", "로그인 실패", "결제 오류")
        )

        groups = res.json()["groups"]
        assert sorted(groups[0]["feedbackIds"]) == [1, 2]
        unclassified = next(g for g in groups if g["category"] == "UNCLASSIFIED")
        assert unclassified["feedbackIds"] == [3]


class TestComparisons:
    @staticmethod
    def _body(prev_version: int = 2) -> dict[str, Any]:
        def group(gid: int, name: str) -> dict[str, Any]:
            return {"groupId": gid, "name": name, "category": "BUG", "improvementRank": 2}

        return {
            "previous": {
                "version": prev_version,
                "groups": [group(10, "로그인"), group(11, "결제")],
            },
            "current": {"version": 3, "groups": [group(20, "인증"), group(21, "다크모드")]},
        }

    def test_compare(self, client: TestClient, llm: FakeLLM) -> None:
        llm.proposed_matches = [GroupMatch(current_group_id=20, previous_group_id=10)]
        res = client.post("/v1/comparisons", json=self._body())

        assert res.status_code == 200
        body = res.json()
        assert body["matches"] == [{"currentGroupId": 20, "previousGroupId": 10}]
        assert body["newGroupIds"] == [21]
        assert body["notReportedGroupIds"] == [11]

    @pytest.mark.parametrize("prev_version", [3, 4])
    def test_version_order_is_enforced(self, client: TestClient, prev_version: int) -> None:
        res = client.post("/v1/comparisons", json=self._body(prev_version))
        assert res.status_code == 422


def test_followup_questions(client: TestClient) -> None:
    res = client.post(
        "/v1/followup-questions",
        json={
            "context": CONTEXT,
            "feedback": {"feedbackId": 1, "userId": 1, "content": "UI가 좀 별로예요"},
        },
    )
    assert res.status_code == 200
    assert len(res.json()["questions"]) == 3


def test_ready(client: TestClient) -> None:
    assert client.get("/health/ready").status_code == 200


def test_request_id_is_echoed(client: TestClient) -> None:
    res = client.get("/health/live", headers={"X-Request-ID": "abc-123"})
    assert res.headers["x-request-id"] == "abc-123"
