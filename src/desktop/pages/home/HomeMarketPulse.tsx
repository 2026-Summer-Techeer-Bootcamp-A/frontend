import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import {
  homeApi,
  mergePostingTimelines,
  mergeSkillShares,
  summarizePostingTimeline,
  type PostingTimelineDto,
  type PostingTimelineSummaryDay,
  type SkillShareDto,
} from '../../../career/homeApi'

/* 좌측 컬럼 하단을 채우는 "채용 시장" 데이터 위젯.
   기존 stats API만 재사용한다 — 최근 7일 공고 추이(스파크라인) + 지금 뜨는 기술 top5(막대).
   실패하면 카드 자체를 숨겨 컬럼이 깨지지 않게 한다(뉴스/공고 리스트 카드와 동일 정책). */

const TOP_K = 5
const TIMELINE_DAYS = 7
const TIMELINE_HISTORY_DAYS = 365
const COMBINED_SKILL_CANDIDATES = 100
// 시각화 저채도 팔레트 순환(비주얼 스펙 — 데이터 표현 요소 전용).
const VIZ_VARS = ['--hf-viz-blue', '--hf-viz-sage', '--hf-viz-violet', '--hf-viz-clay', '--hf-viz-slate']

const POOL_LABEL: Record<'all' | 'domestic' | 'global', string> = {
  all: '전체',
  domestic: '국내',
  global: '해외',
}

function Sparkline({ daily }: { daily: PostingTimelineSummaryDay[] }) {
  const totals = daily.map((d) => d.displayTotal)
  const max = Math.max(1, ...totals)
  const n = totals.length
  // viewBox 0..100 x, 0..40 y. 한 점만 있으면 가로 직선으로 그린다.
  const pts = totals.map((t, i) => {
    const x = n <= 1 ? 100 : (i / (n - 1)) * 100
    const y = 38 - (t / max) * 34
    return [x, y] as const
  })
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `0,40 ${line} 100,40`
  const outlierLabel = daily
    .filter((day) => day.isOutlier)
    .map((day) => `${day.date} ${day.total.toLocaleString()}건`)
    .join(', ')
  return (
    <svg
      className="hfeed-mpulse__spark"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      role="img"
      aria-label={outlierLabel ? `최근 등록 추이. 특이값: ${outlierLabel}` : '최근 등록 추이'}
    >
      <polygon points={area} fill="var(--hf-viz-blue-soft)" />
      <polyline
        points={line}
        fill="none"
        stroke="var(--hf-viz-blue)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {daily.map((day, index) => {
        if (!day.isOutlier) return null
        const [cx, cy] = pts[index]
        return (
          <circle
            key={day.date}
            className="hfeed-mpulse__outlier-dot"
            cx={cx}
            cy={cy}
            r="2.4"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </svg>
  )
}

export default function HomeMarketPulse({ pool }: { pool: 'all' | 'domestic' | 'global' }) {
  const navigate = useNavigate()

  const [share, setShare] = useState<SkillShareDto | null>(null)
  const [timeline, setTimeline] = useState<PostingTimelineDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const statPools: ('domestic' | 'global')[] = pool === 'all' ? ['domestic', 'global'] : [pool]
    const skillTopK = pool === 'all' ? COMBINED_SKILL_CANDIDATES : TOP_K
    setLoading(true)
    setFailed(false)
    Promise.all([
      Promise.all(statPools.map((statPool) => homeApi.skillShare(statPool, skillTopK))),
      Promise.all(statPools.map((statPool) => homeApi.postingTimeline(statPool, TIMELINE_HISTORY_DAYS))),
    ])
      .then(([shares, timelines]) => {
        if (cancelled) return
        setShare(pool === 'all' ? mergeSkillShares(shares, TOP_K) : shares[0])
        setTimeline(pool === 'all' ? mergePostingTimelines(timelines) : timelines[0])
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [pool])

  const timelineSummary = useMemo(
    () => (timeline ? summarizePostingTimeline(timeline.daily, TIMELINE_DAYS) : null),
    [timeline],
  )
  const maxShare = useMemo(
    () => (share && share.items.length > 0 ? Math.max(...share.items.map((i) => i.share)) : 1),
    [share],
  )

  // 실패 시 카드 숨김. 로딩 중엔 스켈레톤으로 자리를 잡아 레이아웃 점프를 막는다.
  if (failed) return null

  return (
    <section className="hfeed-mpulse card">
      <div className="hfeed-mpulse__head">
        <h3>채용 시장</h3>
        <span className="hfeed-mpulse__pool">{POOL_LABEL[pool]}</span>
      </div>

      {loading ? (
        <div className="hfeed-mpulse__skel" aria-hidden="true">
          <div className="hfeed-skel" style={{ width: '100%', height: 44, borderRadius: 10 }} />
          <div className="hfeed-skel" style={{ width: '70%', height: 12, marginTop: 12 }} />
          <div className="hfeed-skel" style={{ width: '100%', height: 10, marginTop: 10 }} />
          <div className="hfeed-skel" style={{ width: '100%', height: 10, marginTop: 8 }} />
          <div className="hfeed-skel" style={{ width: '100%', height: 10, marginTop: 8 }} />
        </div>
      ) : (
        <>
          {timeline && timelineSummary && timelineSummary.recent.length > 0 && (
            <div className="hfeed-mpulse__trend">
              <div className="hfeed-mpulse__trend-cap">최근 {TIMELINE_DAYS}일 등록 추이</div>
              <div className="hfeed-mpulse__trend-meta">
                <span>
                  평소 하루 <b className="tnum">{timelineSummary.median.toLocaleString()}건</b>
                </span>
                {timelineSummary.outlierCount > 0 && (
                  <span className="hfeed-mpulse__outlier">
                    특이값 <b className="tnum">{timelineSummary.outlierCount}일</b>
                  </span>
                )}
              </div>
              <Sparkline daily={timelineSummary.recent} />
              <div className="hfeed-mpulse__asof">기준 {timeline.as_of}</div>
            </div>
          )}

          {share && share.items.length > 0 && (
            <div className="hfeed-mpulse__skills">
              <div className="hfeed-mpulse__skills-cap">지금 많이 찾는 기술</div>
              {share.items.map((item, idx) => (
                <button
                  key={item.canonical}
                  type="button"
                  className="hfeed-mpulse__bar"
                  onClick={() => navigate(`/jobs?skills=${encodeURIComponent(item.canonical)}`)}
                  title={`${item.canonical} 공고 보기`}
                >
                  <span className="hfeed-mpulse__bar-k">{item.canonical}</span>
                  <span className="hfeed-mpulse__bar-tr">
                    <i
                      style={{
                        width: `${Math.max(6, (item.share / maxShare) * 100)}%`,
                        background: `var(${VIZ_VARS[idx % VIZ_VARS.length]})`,
                      }}
                    />
                  </span>
                  <span className="hfeed-mpulse__bar-v tnum">{item.posting_count.toLocaleString()}</span>
                </button>
              ))}
              <button type="button" className="hfeed-mpulse__more" onClick={() => navigate('/market')}>
                채용 시장 전체 보기
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
