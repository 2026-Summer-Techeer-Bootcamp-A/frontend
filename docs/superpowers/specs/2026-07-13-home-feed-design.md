# 홈 피드 (LinkedIn 스타일 3컬럼) 설계 스펙

- 날짜: 2026-07-13
- 상태: 사용자 승인됨
- 대상: frontend (React+Vite) + backend (FastAPI)
- 모델 워크플로우: 구체화/플래닝 = Fable(메인), 디자인 = Opus 서브에이전트,
  구현 = Sonnet/Haiku 서브에이전트 (프로젝트 CLAUDE.md 참조)

## 1. 목적

대시보드 UI를 원하지 않는 사용자와 비회원을 위한 소비형 진입 화면.
LinkedIn 피드처럼 채용 공고를 최신순 타임라인으로 흘려보고,
기술 뉴스/트렌드를 곁들여 "매일 열어보는 화면"을 만든다.

역할 구분 (겹침 방지가 핵심):

- 홈 = 피드 (소비, 최신순, 개인화 하이라이트)
- 대시보드 = 내 현황판 (위젯 그리드)
- 시장 = 분석 심화 (차트/통계)

홈에는 위젯 그리드를 넣지 않는다. 피드에만 집중한다.

## 2. 라우팅 / 메뉴

- 신규 경로 `/home`. 기존 `/`(대시보드)는 변경하지 않는다.
- 데스크톱 사이드바(`src/desktop/DesktopShell.tsx`)의 SECTIONS 최상단에
  "홈" 섹션 추가. 결과 순서: 홈 - 대시보드 - 검색 - 채용 시장 - 마이 -
  어시스턴트 - 설정.
- 홈은 로그인 없이 전체 접근 가능 (게스트 허용 라우트).
- 비로그인 시 `/` -> `/home` 리다이렉트는 이번 스코프에서 제외 (추후 판단).

## 3. 화면 레이아웃 (데스크톱 3컬럼)

전체 폭 기준: 좌 ~280px (sticky) / 중앙 max ~680px (메인 스크롤) /
우 ~340px (sticky). 디자인 토큰은 `src/design/design-system.css` +
모노크롬 커맨드센터 룩을 따른다.

### 3.1 좌측 컬럼 - 내 정보

로그인 상태:

- 프로필 카드: 이름, 이니셜 아바타, 타깃 직무 한 줄.
- 이력서 요약 카드: 단일 이력서(멀티 이력서 없음) 기준 보유 스킬 칩,
  스킬 수/완성도 요약, "이력서 편집" 링크(`/resume`).
- 빠른 링크: 북마크한 공고, 최근 본 공고 (기존 `bookmarkStore` /
  `viewHistoryStore` 재사용).

비로그인 상태:

- 서비스 소개 + 로그인/회원가입 CTA 카드.
  카피 방향: "로그인하면 공고마다 내 이력서 매치율이 보여요."

### 3.2 중앙 컬럼 - 공고 타임라인

- 상단 필터 바: pool 토글(전체/국내/해외), 직무 카테고리 퀵 필터.
- 날짜 구분선: "오늘 / 어제 / 7월 11일" 형태로 그룹핑.
- 공고 카드 필드:
  - 회사명, 회사 종류(industry), 회사 위치(region)
  - 공고 제목
  - 게시일(상대시간, 예: "2시간 전") + 마감일(D-day 뱃지)
  - 직무 카테고리 칩, 기술 스택 칩
  - 로그인 시: 매치율 % 링/뱃지, 기술 칩을 보유(filled)/미보유(outline)로 구분
  - 액션: 상세보기(기존 `/job/:id`로 이동), 북마크 토글
- 지도/상세 정보는 카드에 넣지 않는다. 상세 페이지에 이미 임베드되어 있다.
- 무한 스크롤 (DB 레벨 페이지네이션, 최신순).
- 비로그인 시 개인화 요소(매치율, 보유/미보유 구분)만 조용히 빠진 동일 카드.

### 3.3 우측 컬럼 - 뉴스 + 미니 요약

- 기술 뉴스 패널 (탭 3개):
  - HackerNews: 제목, 점수, 댓글 수, 원문 링크 + HN 스레드 링크
  - GeekNews: 제목(한국어), 링크
  - GitHub Trending: repo 이름, 설명, 언어, 스타 지표
  - 패널 상단/하단에 "N분 전 갱신" (응답 `fetched_at` 기반)
- 미니 요약 카드 2~3개 (기존 위젯을 넣지 않고 컴팩트 신규 카드):
  - 오늘 신규 공고 수 -> 시장 페이지 딥링크
  - 이번 주 급상승 스킬 Top3 -> 시장 페이지 딥링크
  - (로그인 시) 내 매치 상위 공고 수 -> 대시보드 딥링크
  - 데이터는 기존 insight/stats 엔드포인트 재사용. 신규 API 없음.

### 3.4 반응형

- >=1280px: 3컬럼.
- 1024~1280px: 우측 컬럼을 중앙 하단으로 이동(또는 접기).
- 모바일: 중앙 피드만. 모바일 탭바 체계는 건드리지 않는다 (desktop-first).

## 4. 백엔드 API

### 4.1 GET /api/v1/feed/postings (신규)

- 신규 라우터 `app/routers/feed.py` (+ `app/schemas/feed.py`,
  `app/services/feed.py`). 기존 `/postings`는 건드리지 않는다 (검색 페이지 회귀 방지).
- 인증: 옵셔널 (`match.py`의 `get_user_from_optional_authorization` 패턴 재사용).
- 파라미터: `page`, `page_size`, `pool`(global/domestic), `category`(옵션).
- 정렬: `post_date` 내림차순. DB 레벨 페이지네이션 필수.
- 응답 `FeedPostingItem` = 기존 `PostingCardItem` 확장:
  - 추가: `industry`, `region`, `categories`, `pool`
  - 로그인 시: `match: { rate: float, owned_skills: [str], missing_skills: [str] }`
  - 매치 계산: 사용자 이력서 스킬셋 1회 로드 -> 공고별 set 교집합.
    rate = |교집합| / |공고 스킬| (공고 스킬 0개면 match 필드 null).
- 개인화 계산 실패 시 익명 카드로 degrade (500 내지 않음).

### 4.2 GET /api/v1/news (신규)

- 신규 라우터 `app/routers/news.py` + 서비스 `app/services/news.py`.
- 파라미터: `source` = `hackernews` | `geeknews` | `github`, `limit`(기본 15).
- 캐시: Redis `news:{source}` TTL 4시간(14400s), lazy fetch (미스 시 외부 호출).
  DB 저장 없음.
- Stale 폴백: fetch 성공 시 `news:{source}:stale` 키에 TTL 24h로 복사본 저장.
  외부 fetch 실패 시 stale 반환, 그것도 없으면 `items: []` + `error` 플래그.
- 소스별 fetch (전부 backend에서 httpx로):
  - HackerNews: Algolia API (`hn.algolia.com/api/v1/search?tags=front_page`).
    title, points, num_comments, url, HN 스레드 링크(objectID).
  - GeekNews: `news.hada.io` RSS 파싱. title, link.
  - GitHub Trending: 공식 API 없음. 1차 HTML 파싱, 실패 시 GitHub Search API
    (최근 N일 생성 repo star 순) 폴백. repo, description, language, stars.
- 응답: `{ source, items: [...], fetched_at }`. item 스키마는 소스별 필드 옵셔널.

## 5. 에러 처리

- 뉴스: 위 stale 폴백 체계. 프론트는 `error` 플래그 시 "잠시 후 다시" 표시.
- 피드: 개인화 실패 -> 익명 degrade. 목록 실패 -> 기존 에러 상태 컴포넌트 재사용.
- 미니 요약 카드: 개별 실패 시 해당 카드만 숨김 (홈 전체를 막지 않는다).

## 6. 테스트 / 검증

- backend: pytest — feed(익명/인증/페이지네이션/매치 계산), news(httpx mock,
  캐시 히트/미스/stale 폴백).
- frontend: Playwright로 3컬럼 렌더, 게스트/로그인 분기, 무한 스크롤,
  뉴스 탭 전환 확인 (로컬 DB + 실서비스 흐름).

## 7. 스코프 제외 (YAGNI)

- 비로그인 `/` 리다이렉트, 뉴스 DB 적재, 뉴스 검색/필터, 피드 내 지도,
  모바일 전용 홈, 뉴스 소스 추가(3개 이후), 무한 스크롤 가상화.

## 8. 리스크 메모

- GitHub Trending HTML 파싱은 깨질 수 있다. Search API 폴백 + 실패 시
  탭 자체를 숨기는 프론트 처리까지가 안전선.
- 메뉴 7개 증가는 사용자가 인지하고 수용함 (추후 조정 가능성 있음).
