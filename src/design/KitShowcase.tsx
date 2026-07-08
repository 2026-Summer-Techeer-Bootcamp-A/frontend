import { useState } from 'react'
import { FileText, Bell, Settings, Shield, LogOut } from 'lucide-react'
import { THEME, themeVars } from '../career/themes'
import CompanyLogo from '../career/CompanyLogo'
import {
  StatHero, CoverageHistogram, OpportunityQuadrant, PulseCard, SectionHeader,
  DisclosureCard, ResumeHeroCard, MenuRow, BottomSheet, MiniScore, TechIcon,
  MiniJobCard, SkillChip, JobCardCompact, CardModeToggle, ActivityRings, RingLegend,
  type CardMode, type QuadItem, type RingMetric,
} from '../career/kit'
import career from '../data/careerData.json'
import '../career/career.css'

const RESUME: string[] = career.resume.skills
const TOP = career.topTechs as { tech: string; count: number }[]
const gap = TOP.filter((t) => !RESUME.includes(t.tech)).slice(0, 6)
const HIST = career.postings.filter((p) => p.pool === '국내').map((p) => ({ techs: p.techs, held: p.matchHeld, total: p.matchTotal }))
const quad: QuadItem[] = TOP.slice(0, 12).map((t) => ({
  tech: t.tech, demand: t.count, owned: RESUME.includes(t.tech), count: t.count,
}))
const RINGS_DEMO: RingMetric[] = [
  { key: 'cov', label: '커버리지', pct: 73, color: 'var(--c-accent)' },
  { key: 'reach', label: '도달률', pct: 25, color: 'var(--accent-700)', note: '15개 공고' },
]

function Demo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="kit-demo">
      <div className="kit-demo__lb">{label}</div>
      <div className="kit-demo__stage">{children}</div>
    </div>
  )
}

/** 디자인 시스템 페이지용 — 커리어 위젯 킷 쇼케이스 (커리어 토큰 스코프). */
export default function KitShowcase() {
  const [sheet, setSheet] = useState(false)
  const [mode, setMode] = useState<CardMode>('full')

  return (
    <div className="career kit-showcase" style={{ ...themeVars(THEME), padding: 0 }}>
      <Demo label="포지셔닝 점수 히어로 (StatHero)">
        <StatHero
          value={73} title="시장 커버리지"
          sub={<>당신의 <b>14개 기술</b>이 활성 공고의 상당수에 등장해요.</>}
          tag="데모"
        />
      </Demo>

      <Demo label="운동 링 2지표 (ActivityRings) — 커버리지 · 조건 만족 공고 도달률">
        <StatHero
          value={73} title="시장 커버리지"
          rings={<ActivityRings metrics={RINGS_DEMO} />}
          legend={<RingLegend metrics={RINGS_DEMO} />}
        />
      </Demo>

      <Demo label="커버리지 분포 히스토그램 — 기회기술 탭하면 분포 이동 (50% 문턱)">
        <CoverageHistogram postings={HIST} mySkills={RESUME} gap={gap} poolLabel="국내" />
      </Demo>

      <Demo label="기술 스택 아이콘 (TechIcon) — 브랜드색 이니셜 배지">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Python', 'TypeScript', 'React', 'Kubernetes', 'AWS', 'Docker', 'Java', 'Go', 'Rust', 'PostgreSQL'].map((tc) => (
            <TechIcon key={tc} tech={tc} size={32} />
          ))}
        </div>
      </Demo>

      <Demo label="편집 가능한 스킬 칩 (SkillChip) — 삭제·추가">
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {RESUME.slice(0, 6).map((s) => <SkillChip key={s} tech={s} onRemove={() => {}} />)}
          <button className="kit-schip add">＋ 추가</button>
        </div>
      </Demo>

      <Demo label="지도 미니 잡카드 (MiniJobCard) — 가로 · 화면 내 회사">
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }}>
          {career.postings.filter((p) => p.pool === '국내').slice(0, 3).map((p) => (
            <MiniJobCard key={p.id} logo={<CompanyLogo logo={p.logo} name={p.company} size={36} radius={10} />}
              company={p.company} matchPct={p.matchPct} />
          ))}
        </div>
      </Demo>

      <Demo label="커스텀 스크롤바 (.kit-scroll) — 세로 / 가로">
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="kit-scroll" style={{ height: 110, width: 150, border: '1px solid var(--line)', borderRadius: 12, padding: 10 }}>
            {Array.from({ length: 12 }, (_, i) => <div key={i} style={{ fontSize: 13, padding: '5px 2px' }}>세로 항목 {i + 1}</div>)}
          </div>
          <div className="kit-scroll kit-scroll--x" style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 12, padding: 10 }}>
            <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
              {Array.from({ length: 12 }, (_, i) => <span key={i} className="cr-chip held" style={{ whiteSpace: 'nowrap' }}>가로 {i + 1}</span>)}
            </div>
          </div>
        </div>
      </Demo>

      <Demo label="기회 사분면 (OpportunityQuadrant) — 우하단=수요↑·미보유">
        <OpportunityQuadrant items={quad} />
      </Demo>

      <Demo label="주간 시장 펄스 (PulseCard) — 자동 서사 카드">
        <PulseCard items={[
          { tech: 'Kubernetes', text: <><b>Kubernetes</b> 수요 상승 · 미보유 → 기회 기술</> },
          { tech: 'Python', text: <><b>Python</b>은 당신의 강점 — 시장 수요 상위</> },
          { tech: 'TypeScript', text: <><b>TypeScript</b> 국내 공고 증가 중</> },
        ]} />
      </Demo>

      <Demo label="섹션 헤더 + 드릴다운 디스클로저 (progressive disclosure)">
        <SectionHeader title="시장 수요" hint="상위 기술" />
        <DisclosureCard title="함께 요구되는 기술" summary="React → TypeScript 82% …" defaultOpen>
          <div style={{ fontSize: 13, color: 'var(--c-muted)', lineHeight: 1.6 }}>
            탭하면 펼쳐지는 상세 영역 — 높이가 부드럽게 전개돼요 (grid-rows 0fr→1fr, 350ms standard).
          </div>
        </DisclosureCard>
        <DisclosureCard title="연도별 추이" summary="2019~2026 · himalayas 제외">
          <div style={{ fontSize: 13, color: 'var(--c-muted)' }}>세부 차트가 여기에.</div>
        </DisclosureCard>
      </Demo>

      <Demo label="이력서 히어로 카드 (ResumeHeroCard) — 마이 상단">
        <ResumeHeroCard
          title={career.resumes[0].title} position={career.resumes[0].position}
          career={`경력 ${career.resumes[0].careerMin}~${career.resumes[0].careerMax}년`}
          coverage={career.resumes[0].coveragePct} skillCount={RESUME.length} onEdit={() => {}}
        />
      </Demo>

      <Demo label="메뉴 리스트 (MenuRow) — 설정·로그아웃">
        <div className="kit-menulist">
          <MenuRow icon={<FileText size={18} />} label="이력서 관리" value="3개" />
          <MenuRow icon={<Bell size={18} />} label="알림 설정" />
          <MenuRow icon={<Shield size={18} />} label="개인정보 · 데이터" />
          <MenuRow icon={<Settings size={18} />} label="설정" />
          <MenuRow icon={<LogOut size={18} />} label="로그아웃" danger />
        </div>
      </Demo>

      <Demo label="공고 카드 — 전체 / 컴팩트 모드 (필터에서 전환)">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <CardModeToggle mode={mode} onChange={setMode} />
        </div>
        {mode === 'compact' ? (
          <>
            <JobCardCompact
              job={{ company: '유닛커넥트', title: 'EV충전 백엔드 개발자 채용', careerLabel: '경력 2~4년', matchPct: 78 }}
              logo={<CompanyLogo logo="" name="유닛커넥트" size={40} radius={11} />}
            />
            <JobCardCompact
              job={{ company: '클로버추얼패션(CLOVirtualFashion)', title: 'Machine Learning Engineer, R&D — 매우 긴 채용 제목 예시입니다', careerLabel: '경력 3년+', matchPct: 44 }}
              logo={<CompanyLogo logo="" name="클로버" size={40} radius={11} />}
              scroll
            />
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--c-muted)', padding: '10px 2px' }}>
            전체 모드 = 기존 공고 카드(요구기술 막대·칩·풋터). 컴팩트로 바꾸면 우측 미니 원형 점수 + 긴 이름 말줄임/스크롤.
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8 }}>
          <MiniScore pct={78} />
          <MiniScore pct={44} />
          <MiniScore pct={20} />
          <span style={{ fontSize: 12, color: 'var(--c-muted)' }}>MiniScore — 매칭 점수 원형</span>
        </div>
      </Demo>

      <Demo label="바텀시트 (BottomSheet) — 아래서 스프링 등장 · 마커 탭 시">
        <button className="kit-linkrow" onClick={() => setSheet(true)} style={{ marginTop: 0 }}>
          바텀시트 열기
        </button>
        <div style={{ position: 'relative', height: sheet ? 200 : 0, transition: 'height .2s', overflow: 'hidden' }}>
          <BottomSheet open={sheet} onClose={() => setSheet(false)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CompanyLogo logo="" name="유닛커넥트" size={44} radius={12} />
              <div>
                <div style={{ fontWeight: 700 }}>유닛커넥트 <b style={{ color: 'var(--c-accent)' }}>78%</b></div>
                <div style={{ fontSize: 12.5, color: 'var(--c-muted)' }}>EV충전 백엔드 개발자 · 중원구</div>
              </div>
            </div>
          </BottomSheet>
        </div>
      </Demo>
    </div>
  )
}
