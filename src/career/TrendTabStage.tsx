import { Suspense, lazy, useState } from 'react'
import { Building2, LineChart, Radio, Share2, Users, Zap } from 'lucide-react'
import { Card } from './charts'
import { PageTransition, SegmentedControl } from './kit'
import './trendTabStage.css'

/* 시안 1a "탭 스테이지" — 6종 트렌드 차트를 세로 접이식 나열 대신
   탭 바 + 큰 피처드 스테이지 + 나머지 5종 미니 프리뷰 썸네일 행으로 재구성.
   6개 차트는 전부 insights.tsx 원본 컴포넌트를 그대로 재사용하고, 선택된
   것만 스테이지에 마운트한다(비선택 5개는 ECharts 인스턴스를 만들지 않음).
   차트 모듈 자체는 동일한 './insights' 스펙시파이어에서 dynamic import로
   불러와 하나의 비동기 청크로 분리한다 — MarketScreen 이력서 진단 섹션이
   IndustryFitRadar/TechChainRoadmap 때문에 insights.tsx를 함께 쓰는 경우엔
   그 청크가 어차피 로드되지만, 이력서가 없는 방문자(로그인 전 탐색)에게는
   여섯 차트+echarts 번들을 트렌드 탭을 실제로 열기 전까지 미룰 수 있다. */
const TechYearlyTrendChart = lazy(() => import('./insights').then((m) => ({ default: m.TechYearlyTrendChart })))
const TechMoversBar = lazy(() => import('./insights').then((m) => ({ default: m.TechMoversBar })))
const TechCoNetworkGraph = lazy(() => import('./insights').then((m) => ({ default: m.TechCoNetworkGraph })))
const TrendPropagationGraph = lazy(() => import('./insights').then((m) => ({ default: m.TrendPropagationGraph })))
const GenerationTrendChart = lazy(() => import('./insights').then((m) => ({ default: m.GenerationTrendChart })))
const TierCompareChart = lazy(() => import('./insights').then((m) => ({ default: m.TierCompareChart })))

type TabKey = 'share' | 'movers' | 'cooc' | 'propagation' | 'generation' | 'tier'

const TABS: { key: TabKey; label: string; summary: string; icon: typeof LineChart }[] = [
  { key: 'share', label: '점유율', summary: '연도별 기술 점유율 · 2022~2025 · 점핏 단일 소스', icon: LineChart },
  { key: 'movers', label: '급변동', summary: '같은 기간 점유율 변화폭 순 Top 6', icon: Zap },
  { key: 'cooc', label: '공동출현', summary: '함께 요구되는 기술 네트워크', icon: Share2 },
  { key: 'propagation', label: '전파', summary: '다음에 뜰 기술 · 글로벌 전용', icon: Radio },
  { key: 'generation', label: '세대별', summary: '회사 설립 세대별 기술 점유율', icon: Users },
  { key: 'tier', label: '규모별', summary: '대기업 · 중견 · 중소 실측 비교', icon: Building2 },
]

export function TrendTabStage({ skills = [] }: { skills?: string[] }) {
  const [active, setActive] = useState<TabKey>('share')
  const activeTab = TABS.find((t) => t.key === active) ?? TABS[0]
  const thumbs = TABS.filter((t) => t.key !== active)

  return (
    <div className="ttab">
      <SegmentedControl
        className="wide"
        value={active}
        onChange={(v) => setActive(v as TabKey)}
        options={TABS.map((t) => ({ key: t.key, label: t.label }))}
      />

      <Card className="ttab__stage">
        <div className="ttab__stage-head">
          <span className="ttab__stage-icon"><activeTab.icon size={14} /></span>
          <span className="ttab__stage-title">{activeTab.summary}</span>
        </div>
        <PageTransition type="fade" keyId={active}>
          <Suspense fallback={<div className="ttab__loading">차트를 불러오는 중…</div>}>
            {active === 'share' && <TechYearlyTrendChart skills={skills} />}
            {active === 'movers' && <TechMoversBar />}
            {active === 'cooc' && <TechCoNetworkGraph skills={skills} />}
            {active === 'propagation' && <TrendPropagationGraph />}
            {active === 'generation' && <GenerationTrendChart skills={skills} />}
            {active === 'tier' && <TierCompareChart />}
          </Suspense>
        </PageTransition>
      </Card>

      <div className="ttab__thumbs">
        {thumbs.map((t) => (
          <button key={t.key} type="button" className="ttab__thumb" onClick={() => setActive(t.key)}>
            <span className="ttab__thumb-icon"><t.icon size={16} /></span>
            <span className="ttab__thumb-label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default TrendTabStage
