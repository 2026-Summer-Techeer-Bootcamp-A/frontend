import { useEffect, useMemo, useRef, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { Sparkles, MapPin, Briefcase } from 'lucide-react'
import feedRaw from '../data/feedData.json'
import './signalFeed.css'

/* ================================================================
   시그니처 · 내게 맞는 공고 타임라인 (/signal/feed)
   실 jumpit publishedAt 기준. 내 기술과 맞는 공고 = 블루, 나머지 = 회색.
   새 공고가 위로 올라오는 스트리밍 피드(데모). viz = ECharts.
   ================================================================ */

const BLUE = '#0b0b0c'
const BLUE_ON = '#5a86cf'
const ON = '#f4f6fb'
const PBORDER = '#262a34'
const GREY = '#3a4150'

type Row = {
  id: number; date: string; title: string; company: string; cat: string
  career: string; techs: string[]; myTechs: string[]; score: number; matched: boolean; loc: string
}
const DATA = feedRaw as unknown as {
  _meta: { source: string; N: number; asOf: string; range: string[]; myskills: string[]; matchedN: number; note: string }
  daily: { date: string; total: number; matched: number }[]
  recent: Row[]
}
const META = DATA._meta
const DAILY = DATA.daily
const RECENT = DATA.recent

const mmdd = (d: string) => d.slice(5)
const REVEAL_MS = 1300
const WINDOW = 11

export default function SignalFeed() {
  // 최근 7일 요약
  const summary = useMemo(() => {
    const last7 = DAILY.slice(-7)
    const total = last7.reduce((a, d) => a + d.total, 0)
    const matched = last7.reduce((a, d) => a + d.matched, 0)
    return { total, matched, pct: total ? Math.round((matched / total) * 100) : 0 }
  }, [])

  // 스트리밍 피드: 오래된 것부터 도착 → 새것이 위로. 순환 루프(데모).
  const arrival = useMemo(() => [...RECENT].reverse(), []) // 오래된→최신
  const [feed, setFeed] = useState<{ row: Row; uid: number }[]>([])
  const idx = useRef(0)
  const uid = useRef(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      // 정적: 최신 WINDOW개 바로 표시
      setFeed(RECENT.slice(0, WINDOW).map((row) => ({ row, uid: uid.current++ })))
      return
    }
    // 초기 몇 개 채우고 시작
    const seed = arrival.slice(0, 5)
    idx.current = 5
    setFeed(seed.reverse().map((row) => ({ row, uid: uid.current++ })))
    const t = setInterval(() => {
      const row = arrival[idx.current % arrival.length]
      idx.current += 1
      setFeed((prev) => [{ row, uid: uid.current++ }, ...prev].slice(0, WINDOW))
    }, REVEAL_MS)
    return () => clearInterval(t)
  }, [arrival])

  const timelineOption = useMemo(() => {
    return {
      animationDuration: 700,
      grid: { left: 40, right: 18, top: 16, bottom: 40 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(90,134,207,0.10)' } },
        backgroundColor: '#12141a', borderColor: PBORDER, borderWidth: 1,
        textStyle: { color: ON, fontFamily: 'Pretendard', fontSize: 12.5 },
        extraCssText: 'border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.4);',
        formatter: (ps: { dataIndex: number }[]) => {
          const d = DAILY[ps[0].dataIndex]
          return `<b>${d.date}</b><br/>
            <span style="color:${BLUE_ON}">●</span> 내게 맞는 공고 <b>${d.matched}</b><br/>
            <span style="color:#8b90a0">●</span> 기타 <b>${d.total - d.matched}</b> · 합계 ${d.total}`
        },
      },
      xAxis: {
        type: 'category', data: DAILY.map((d) => d.date),
        axisLabel: {
          color: '#6a7180', fontFamily: 'Pretendard', fontSize: 10,
          interval: 4, formatter: mmdd,
        },
        axisLine: { lineStyle: { color: PBORDER } }, axisTick: { show: false },
      },
      yAxis: {
        type: 'value', axisLabel: { color: '#6a7180', fontFamily: 'Pretendard', fontSize: 10 },
        axisLine: { show: false }, axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      },
      series: [
        {
          name: '내게 맞는', type: 'bar', stack: 'x',
          data: DAILY.map((d) => d.matched), barWidth: '62%',
          itemStyle: {
            color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: BLUE_ON }, { offset: 1, color: BLUE }] },
            borderRadius: [0, 0, 0, 0],
          },
        },
        {
          name: '기타', type: 'bar', stack: 'x',
          data: DAILY.map((d) => d.total - d.matched), barWidth: '62%',
          itemStyle: { color: GREY, borderRadius: [3, 3, 0, 0] },
        },
      ],
    }
  }, [])

  return (
    <div className="fd-stage">
      <div className="fd-canvas">
        <header className="fd-head">
          <div>
            <span className="fd-eyebrow"><Sparkles size={13} strokeWidth={2.4} /> 시그니처 · 실시간 공고 피드</span>
            <h1 className="fd-title">내게 맞는 공고가 올라오면, 바로 보여요</h1>
            <p className="fd-dek">
              공고가 올라오는 대로 타임라인에 쌓여요. 그중 <b>내 기술과 맞는 공고는 파랗게</b> —
              중요한 것부터 눈에 들어오게요.
            </p>
          </div>
          <div className="fd-summary">
            <div className="fd-summary__row">
              <div className="fd-summary__big">{summary.matched}</div>
              <div className="fd-summary__slash">/ {summary.total}</div>
            </div>
            <div className="fd-summary__lbl">최근 7일 내게 맞는 공고 · {summary.pct}%</div>
            <div className="fd-summary__badge">실측 · jumpit {META.range[0]}~{META.range[1]}</div>
          </div>
        </header>

        {/* 다크 히어로 · 일자별 유입 타임라인 */}
        <section className="fd-hero">
          <div className="fd-hero__bar">
            <div className="fd-hero__title">최근 36일 공고 유입 <span>막대 = 하루 올라온 공고</span></div>
            <div className="fd-legend">
              <span className="fd-lchip"><i className="fd-i-m" /> 내게 맞는</span>
              <span className="fd-lchip"><i className="fd-i-o" /> 기타</span>
            </div>
          </div>
          <ReactECharts option={timelineOption} style={{ height: 208 }} notMerge />
        </section>

        {/* 스트리밍 피드 */}
        <section className="fd-feedwrap">
          <div className="fd-feed__bar">
            <span className="fd-live"><i />LIVE</span>
            <span className="fd-feed__title">방금 올라온 공고</span>
            <span className="fd-feed__hint">새 공고가 위로 올라와요 · 파란 = 내게 맞음</span>
          </div>
          <ul className="fd-feed">
            {feed.map(({ row, uid: u }, i) => (
              <li
                key={u}
                className={'fd-item' + (row.matched ? ' is-match' : '') + (i === 0 ? ' is-new' : '')}
              >
                <span className="fd-item__rail" />
                <div className="fd-item__main">
                  <div className="fd-item__top">
                    <span className="fd-item__title">{row.title}</span>
                    {i === 0 && <span className="fd-item__new">NEW</span>}
                    {row.matched && <span className="fd-item__fit">내 기술 {row.myTechs.length}개 ↑</span>}
                  </div>
                  <div className="fd-item__meta">
                    <span className="fd-item__co">{row.company}</span>
                    {row.cat && <span className="fd-item__tag"><Briefcase size={11} strokeWidth={2.2} />{row.cat}</span>}
                    {row.loc && <span className="fd-item__tag"><MapPin size={11} strokeWidth={2.2} />{row.loc}</span>}
                    <span className="fd-item__career">{row.career}</span>
                  </div>
                  <div className="fd-item__techs">
                    {row.techs.map((t) => {
                      const mine = row.myTechs.includes(t)
                      return <span key={t} className={'fd-tech' + (mine ? ' is-mine' : '')}>{t}</span>
                    })}
                  </div>
                </div>
                <span className="fd-item__date">{mmdd(row.date)}</span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="fd-foot">
          <span className="fd-foot__dot" />
          실측 · jumpit 공고 <b>N={META.N.toLocaleString()}</b> ({META.range[0]}~{META.range[1]}, publishedAt 기준).
          "내게 맞음" = 내 보유 기술 <b>2개+ 겹침</b>(또는 1개+직군 일치) · 전체의 <b>{Math.round((META.matchedN / META.N) * 100)}%</b>.
          피드 애니메이션은 데모예요.
        </footer>
      </div>
    </div>
  )
}
