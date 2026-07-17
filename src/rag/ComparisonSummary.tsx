import type { PostingPostingPayload, ResumePostingPayload, ToolResult } from './chatContract'

// 비교 요약 — 여러 개의 비교 결과(이력서↔공고 여러 건, 공고↔공고 여러 쌍)를 한눈에 정리하는
// 상단 종합 카드. RagConsole 기본 모드에서 ComparisonCards(개별 카드) '위에' 얹혀, 사용자가
// 카드를 하나씩 훑기 전에 "어떤 공고가 가장 잘 맞는지 / 공통으로 뭘 요구하는지 / 내가 뭐가
// 부족한지"를 먼저 파악하게 한다. 데이터 출처는 ComparisonCards와 완전히 동일한 compare
// payload뿐이라(새 API 호출 없음), 카드가 뜨는 상황에서만 요약도 뜨고 서로 어긋나지 않는다.
//
// 첨부가 이력서+공고 1건뿐이면(비교 대상이 하나뿐) 요약이 개별 카드와 사실상 중복이므로 생략한다.
// 여러 공고를 비교할 때만 의미가 생기는 종합 뷰다.

function coveragePostings(results: ToolResult[]): ResumePostingPayload[] {
  return results
    .filter((r) => r.kind === 'resume_posting' && r.compare)
    .map((r) => r.compare as ResumePostingPayload)
    .filter((c) => Array.isArray(c.matched_skills) && Array.isArray(c.missing_skills))
}

function postingPairs(results: ToolResult[]): PostingPostingPayload[] {
  return results
    .filter((r) => r.kind === 'posting_posting' && r.compare)
    .map((r) => r.compare as PostingPostingPayload)
    .filter((c) => Array.isArray(c.shared) && Array.isArray(c.onlyA) && Array.isArray(c.onlyB))
}

// 스킬 이름을 대소문자·공백 무시로 묶어 빈도를 센다. 표시용 라벨은 처음 만난 원문을 유지한다.
function tallySkills(lists: string[][]): { name: string; count: number }[] {
  const byKey = new Map<string, { name: string; count: number }>()
  for (const list of lists) {
    const seen = new Set<string>()
    for (const raw of list) {
      const key = raw.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      const hit = byKey.get(key)
      if (hit) hit.count += 1
      else byKey.set(key, { name: raw.trim(), count: 1 })
    }
  }
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

// 여러 배열의 교집합(대소문자 무시, 표시 라벨은 첫 배열 기준).
function intersectAll(lists: string[][]): string[] {
  if (lists.length === 0) return []
  const [first, ...rest] = lists
  const restSets = rest.map((l) => new Set(l.map((s) => s.trim().toLowerCase())))
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of first) {
    const key = raw.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    if (restSets.every((s) => s.has(key))) out.push(raw.trim())
  }
  return out
}

export default function ComparisonSummary({ results }: { results: ToolResult[] }) {
  const coverage = coveragePostings(results)
  const pairs = postingPairs(results)

  // 종합이 의미 있는 경우: 이력서 대비 공고가 2건 이상이거나, 공고끼리 비교가 1쌍이라도 있을 때.
  const showCoverage = coverage.length >= 2
  const showPairs = pairs.length >= 1
  if (!showCoverage && !showPairs) return null

  const ranked = [...coverage].sort((a, b) => b.coverage_pct - a.coverage_pct)
  const best = ranked[0]
  const maxCov = Math.max(1, ...ranked.map((c) => c.coverage_pct))

  // 공고들이 공통으로 요구하는데 내가 부족한 기술 — 여러 공고에 걸쳐 빈도가 높을수록 우선순위가 높다.
  const commonMissing = tallySkills(coverage.map((c) => c.missing_skills)).slice(0, 8)

  // 공고끼리 비교: 비교한 모든 쌍에서 공통으로 등장한 요구 기술(= 사실상 전 공고 공통 요구).
  const sharedEverywhere = intersectAll(pairs.map((p) => p.shared)).slice(0, 10)
  const comparedPostings = new Set<string>()
  for (const p of pairs) {
    comparedPostings.add(p.postingA)
    comparedPostings.add(p.postingB)
  }

  return (
    <div className="rc__viz-box rc__cmpsum">
      <div className="rc__viz-header">
        <span className="rc__viz-title">비교 요약</span>
      </div>

      {showCoverage && best && (
        <div className="rc__cmpsum-sec">
          <div className="rc__cmpsum-lead">
            가장 잘 맞는 공고 <b>{best.posting_title}</b> · 커버리지 <b>{best.coverage_pct}%</b>
          </div>
          <div className="rc__minichart">
            {ranked.map((c, i) => (
              <div className="rc__mc-row" key={`${c.posting_title}-${i}`}>
                <span className="rc__mc-label">{c.posting_title}</span>
                <span className="rc__mc-track">
                  <span className="rc__mc-fill" style={{ width: `${Math.min(100, (c.coverage_pct / maxCov) * 100)}%` }} />
                </span>
                <span className="rc__mc-val">{c.coverage_pct}%</span>
              </div>
            ))}
          </div>
          {commonMissing.length > 0 && (
            <div className="rc__cmpsum-block">
              <div className="rc__cmpsum-k">공통으로 부족한 기술</div>
              <ul className="rv__diffchips">
                {commonMissing.map((s) => (
                  <li key={s.name} className="rv__diffchip rv__diffchip--missing">
                    ＋ {s.name}
                    {s.count >= 2 && <span className="rc__cmpsum-count">{s.count}개 공고</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {showPairs && (
        <div className="rc__cmpsum-sec">
          <div className="rc__cmpsum-lead">
            공고 {comparedPostings.size}개 비교 · 공통 요구 기술 <b>{sharedEverywhere.length}개</b>
          </div>
          {sharedEverywhere.length > 0 ? (
            <div className="rc__cmpsum-block">
              <div className="rc__cmpsum-k">모든 공고가 공통으로 요구</div>
              <ul className="rv__diffchips">
                {sharedEverywhere.map((s) => (
                  <li key={s} className="rv__diffchip rv__diffchip--matched">✓ {s}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rc__cmpsum-note">모든 공고에 공통으로 걸치는 요구 기술은 없어요 — 아래 카드에서 공고별 차이를 확인하세요.</div>
          )}
        </div>
      )}
    </div>
  )
}
