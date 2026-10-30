---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: []
---

# 서비스 홈 (/)

## Scope
- 모드: Persuade. 처음 온 테스터가 Test Moa를 이해하고 참여를 결심한다. 이미 아는 테스터는 바로 테스트를 찾는다.
- 대상: 테스터 우선, 개발자는 두 번째.
- 행동: 전체 테스트 그리드에서 검색·카테고리·필터로 테스트를 찾아 모집 상세로 간다.
- 콘텐츠: 서비스 소개, 시연용 이벤트·공지, 구독 개발자의 모집 글, 전체 모집 글. 후기·실적은 없다.
- 제약: 라이트·다크 모두 지원, 5명 팀이 토큰과 `components/ui`를 다른 페이지에 재사용.

## Direction contract
THESIS: 모집 글을 디자인 레퍼런스 갤러리처럼 썸네일로 훑고, 검색·카테고리·정렬로 바로 고른다. 회색 히어로 박스 아래 같은 카드 한 줄로 끝나는 체험단 템플릿을 거부한다.
OWN-WORLD: 구조와 밀도는 uibowl 갤러리 문법(한 줄 헤더와 큰 검색창, 순환 배너 옆 순위 패널, 알약 칩, 16px 썸네일 카드, Wanted Sans 굵은 제목). 라이트는 교정쇄: 작업대 회색 #efefec 위 교정지 #fbfbfa 패널, 먹 #1a1a1a, 교정 빨강 #d0021b, 재단선과 CMYK 색 막대, 빨간 교정 도장. 다크는 uibowl 원래 색: #000 바탕, #16181d 패널, #1f222a 칩, #a3aab5 보조, 파랑 #6590ff. (고침 10-30: 강조색을 라이트·다크 모두 에메랄드 계열로 통일. 라이트 #0f7c4a, 다크 #129357)
STORY: 소개 배너로 무엇을 하고 무엇을 받는지 이해하고, 이벤트·공지를 보고, 구독 모집에서 추가 보상 글을 확인한 뒤, 전체 그리드에서 자기 조건으로 걸러 지원하러 간다.
FIRST VIEWPORT: 한 줄 헤더(로고, 탭, 검색창, 내 정보, 크레딧). 아래 왼쪽 2/3에 재단선이 둘린 순환 배너(소개 → 이벤트 → 공지), 오른쪽 1/3에 '마감 임박 테스트 1~5' 순위 패널. 소개 슬라이드의 '테스트 둘러보기'가 주 행동이고, 그 아래로 구독 모집 썸네일 줄이 시작된다.
FORM: 사용자가 추가 요청한 uibowl 참고 갤러리형(grounded), 라이트는 교정쇄 팔레트로 번역. seed:720f34ac549fc033
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment
썸네일은 가짜 스크린샷이 아니라 교정지 위에 서비스 이름을 앉힌 활자 썸네일이고, 정원이 찬 모집에는 빨간 교정 도장 '모집 완료'가 찍힌다.

## Unresolved
- 실제 이벤트·공지 내용과 상세 페이지
- 모집 글 썸네일에 실제 서비스 스크린샷을 받을지
