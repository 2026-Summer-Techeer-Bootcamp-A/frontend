import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, LocateFixed, Maximize2, Home, BarChart3, Map as MapIcon, User, ArrowLeft,
  SlidersHorizontal, X, Check,
} from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import PhoneFrame from '../components/PhoneFrame'
import CompanyLogo from './CompanyLogo'
import JobSheet from './JobSheet'
import { MiniJobCard, MiniJobSkeleton, DynamicDock, BottomSheet, SegmentedControl } from './kit'
import { LocationPermissionSheet } from './states'
import { THEME, themeVars } from './themes'
import { useResumesState, getDynamicPostings, useSavedJobs, jobKey, ddayInfo } from './state'
import market from '../data/marketData.json'
import data from '../data/careerData.json'
import './career.css'
import './screens.css'

type Pin = {
  id: string; lat: number; lng: number; company: string; title: string
  district: string; matchPct: number; tier: string | null; held: number; total: number; logo: string
  dday: number | null
}
type Cluster = { district: string; count: number; avgMatch: number; lat: number; lng: number }
type Entry = { key: string; lat: number; lng: number; jobs: Pin[] }
const MAP = market.map as { asOf: string; N: number; note: string; pins: Omit<Pin, 'dday'>[]; clusters: Cluster[] }
// 서울+수도권(경기)까지 포함하도록 확장 — 공고 50건 추가분 중 성남/화성/용인/수원 등이 여기 포함된다.
const B = { latMin: 37.20, latMax: 37.75, lngMin: 126.70, lngMax: 127.30 }
const ME: [number, number] = [37.503, 127.045]
const ZOOM_INDIV = 14
// 2~3개는 뭉치지 말고 각자 실제 위치에 개별 핀으로, 4개부터만 클러스터 버블로 묶는다.
const MIN_CLUSTER_SIZE = 4
const CLUSTER_RADIUS_PX = 60
// 2~3개가 같은 지점에 겹칠 때 카드가 포개지지 않도록 세로로 살짝 흩어 놓는 오프셋(px)
const JITTER_Y: Record<number, number[]> = { 2: [-15, 15], 3: [-22, 0, 22] }
type Job = (typeof data.postings)[number]
const tierClass = (t: string | null) => (t === '대기업' ? 't1' : t === '중견' ? 't2' : 't3')
const POSTINGS_BY_ID = new Map(data.postings.map((p) => [p.id, p]))
const AS_OF = data.meta.asOf
const TIERS = ['대기업', '중견', '중소'] as const
const MATCH_STEPS = [0, 30, 50, 70] as const

function haversineKm(a: [number, number], b: [number, number]) {
  const R = 6371
  const dLat = ((b[0] - a[0]) * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const la1 = (a[0] * Math.PI) / 180
  const la2 = (b[0] * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}
function distLabel(p: { lat: number; lng: number }) {
  const km = haversineKm(ME, [p.lat, p.lng])
  return km < 1 ? `직선 ${Math.round(km * 1000)}m` : `직선 ${km.toFixed(1)}km`
}
// 같은 회사가 같은 위치에 공고를 여러 건 올린 경우 카드를 겹쳐 띄우지 않고 하나로 묶는다.
function buildEntries(pins: Pin[]): Entry[] {
  const map = new Map<string, Pin[]>()
  pins.forEach((p) => {
    const key = `${p.company}__${p.lat.toFixed(3)}_${p.lng.toFixed(3)}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  })
  return [...map.entries()].map(([key, jobs]) => {
    const best = [...jobs].sort((a, b) => b.matchPct - a.matchPct)[0]
    return { key, lat: best.lat, lng: best.lng, jobs }
  })
}

const NAV_TABS = [
  { key: 'home', label: '홈', icon: Home, to: '/' },
  { key: 'market', label: '시장', icon: BarChart3, to: '/market' },
  { key: 'map', label: '지도', icon: MapIcon, to: '/map' },
  { key: 'resume', label: '마이', icon: User, to: '/resume' },
] as const

export default function MapScreen() {
  const t = THEME
  const navigate = useNavigate()
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [sel, setSel] = useState<Job | null>(null)
  const [visible, setVisible] = useState<Pin[]>([])
  const [loading, setLoading] = useState(false)
  const [menu, setMenu] = useState<{ pins: Pin[] } | null>(null)
  const [menuSort, setMenuSort] = useState<'match' | 'deadline'>('match')
  // 독이 접히는 동안에도 리스트가 유지되도록 마지막 값을 붙잡아 둔다(내용이 먼저 사라지는 점프 방지).
  const [menuShown, setMenuShown] = useState<{ pins: Pin[] } | null>(null)
  useEffect(() => { if (menu) setMenuShown(menu) }, [menu])
  const menuView = menu ?? menuShown

  // 검색
  const [query, setQuery] = useState('')
  // 지도 첫 진입 시 위치 권한 요청 1회 (브라우저당). 데모에서 흔한 권한 플로우.
  const [permOpen, setPermOpen] = useState(() => !localStorage.getItem('techeer_loc_perm_asked'))
  const closePerm = () => { setPermOpen(false); localStorage.setItem('techeer_loc_perm_asked', '1') }
  const [searchFocused, setSearchFocused] = useState(false)
  // 필터
  const [filterOpen, setFilterOpen] = useState(false)
  const [tierFilter, setTierFilter] = useState<Set<string>>(new Set(TIERS))
  const [minMatch, setMinMatch] = useState(0)
  const [deadlineOnly, setDeadlineOnly] = useState(false)
  // 이 지역에서 재검색

  const { activeResume } = useResumesState()
  const activeSkills = activeResume ? activeResume.skills : []
  const dynamicPostings = useMemo(() => getDynamicPostings(activeSkills), [activeSkills])
  const { savedKeys } = useSavedJobs()

  // 핀 → 실제 공고 찾아 리치 시트 열기
  const openPin = (p: Pin) => {
    setSel(dynamicPostings.find((x) => x.company === p.company && x.title === p.title) ?? null)
    setMenu(null)
  }

  const pins = useMemo(() => {
    return MAP.pins.filter((p) => p.lat >= B.latMin && p.lat <= B.latMax && p.lng >= B.lngMin && p.lng <= B.lngMax)
      .map((p) => {
        const post = dynamicPostings.find((x) => x.company === p.company && x.title === p.title)
        const dd = ddayInfo(POSTINGS_BY_ID.get(p.id)?.closeDate || '', AS_OF)
        return { ...p, matchPct: post ? post.matchPct : p.matchPct, dday: dd?.d ?? null }
      })
  }, [dynamicPostings])

  const clusters = useMemo(() => MAP.clusters.filter((c) => c.lat >= B.latMin && c.lat <= B.latMax), [])

  // 필터 적용(기업 규모 · 매칭 최소치 · 마감임박만)
  const filteredPins = useMemo(() => pins.filter((p) => (
    tierFilter.has(p.tier || '중소')
    && p.matchPct >= minMatch
    && (!deadlineOnly || (p.dday != null && p.dday <= 7))
  )), [pins, tierFilter, minMatch, deadlineOnly])

  const entries = useMemo(() => buildEntries(filteredPins), [filteredPins])

  // 검색 자동완성 — 지역명 · 회사명
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return [] as { type: 'district' | 'company'; label: string; pin?: Pin }[]
    const districts = [...new Set(filteredPins.map((p) => p.district))]
      .filter((d) => d.toLowerCase().includes(q)).slice(0, 4)
      .map((d) => ({ type: 'district' as const, label: d }))
    const companies = filteredPins.filter((p) => p.company.toLowerCase().includes(q)).slice(0, 6)
      .map((p) => ({ type: 'company' as const, label: p.company, pin: p }))
    return [...districts, ...companies]
  }, [query, filteredPins])

  const flyToDistrict = (district: string) => {
    const ps = filteredPins.filter((p) => p.district === district)
    if (!ps.length || !mapRef.current) return
    const lat = ps.reduce((s, p) => s + p.lat, 0) / ps.length
    const lng = ps.reduce((s, p) => s + p.lng, 0) / ps.length
    mapRef.current.flyTo([lat, lng], ZOOM_INDIV, { duration: 0.6 })
    setQuery(''); setSearchFocused(false)
  }
  const flyToCompany = (p: Pin) => {
    mapRef.current?.flyTo([p.lat, p.lng], ZOOM_INDIV + 1, { duration: 0.6 })
    openPin(p)
    setQuery(''); setSearchFocused(false)
  }

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { center: [37.525, 127.02], zoom: 12, zoomControl: false, attributionControl: false })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)
    mapRef.current = map

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    // 자체 근접 그루핑 — leaflet.markercluster는 2개만 겹쳐도 무조건 뭉쳐서 실제 위치가
    // 사라지는 문제가 있어, 화면 픽셀 거리 기준으로 직접 묶고 "4개 이상일 때만" 버블로
    // 합친다. 2~3개는 각자 실제 좌표에 개별 카드로 두되, 겹치면 세로로만 살짝 흩어놓는다.
    const MENU_ZOOM = 14
    const group = L.layerGroup().addTo(map)

    const groupByProximity = () => {
      const pts = entries.map((e) => ({ e, pt: map.latLngToContainerPoint([e.lat, e.lng]) }))
      const used = new Array(pts.length).fill(false)
      const out: { entries: Entry[]; pt: L.Point }[] = []
      for (let i = 0; i < pts.length; i++) {
        if (used[i]) continue
        used[i] = true
        const bucket = [pts[i]]
        for (let j = i + 1; j < pts.length; j++) {
          if (used[j] || pts[i].pt.distanceTo(pts[j].pt) > CLUSTER_RADIUS_PX) continue
          used[j] = true
          bucket.push(pts[j])
        }
        const cx = bucket.reduce((s, b) => s + b.pt.x, 0) / bucket.length
        const cy = bucket.reduce((s, b) => s + b.pt.y, 0) / bucket.length
        out.push({ entries: bucket.map((b) => b.e), pt: L.point(cx, cy) })
      }
      return out
    }

    const draw = () => {
      group.clearLayers()
      const clustersHere = groupByProximity()
      // 충분히 확대(ZOOM_INDIV 이상)했을 때만 2~3개를 낱개로 풀어준다. 축소된 상태에서는
      // 2개 이상이면 전부 버블로 묶어 큰 클러스터와 섞여 지저분해 보이지 않게 한다.
      const minSize = map.getZoom() >= ZOOM_INDIV ? MIN_CLUSTER_SIZE : 2
      clustersHere.forEach((c) => {
        const allJobs = c.entries.flatMap((e) => e.jobs)
        if (c.entries.length >= minSize) {
          const avg = Math.round(allJobs.reduce((s, p) => s + (p.matchPct || 0), 0) / allJobs.length)
          const cnt: Record<string, number> = {}
          allJobs.forEach((p) => { if (p.district) cnt[p.district] = (cnt[p.district] || 0) + 1 })
          const dist = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || '서울'
          const hasSaved = allJobs.some((p) => savedKeys.has(jobKey(p)))
          const sz = 46 + Math.min(30, c.entries.length * 1.4)
          const icon = L.divIcon({
            className: 'lpin-wrap',
            html: `<div class="lclus${hasSaved ? ' lclus--saved' : ''}" style="width:${sz}px;height:${sz}px;background:conic-gradient(var(--c-accent) 0 ${avg}%, #d7dde7 ${avg}% 100%)"><div class="lclus__hole"><b>${c.entries.length}</b><span>${esc(dist)}</span></div></div>`,
            iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
          })
          const latlng = map.containerPointToLatLng(c.pt)
          const m = L.marker(latlng, { icon })
          m.on('click', () => {
            if (map.getZoom() < MENU_ZOOM) map.flyTo(latlng, Math.min(16, map.getZoom() + 2), { duration: 0.5 })
            else setMenu({ pins: allJobs })
          })
          group.addLayer(m)
        } else {
          const yOffsets = c.entries.length > 1 ? JITTER_Y[c.entries.length] : [0]
          c.entries.forEach((entry, idx) => {
            const best = entry.jobs[0]
            const pt = map.latLngToContainerPoint([entry.lat, entry.lng])
            const latlng = c.entries.length > 1 ? map.containerPointToLatLng(L.point(pt.x, pt.y + yOffsets[idx])) : [entry.lat, entry.lng] as L.LatLngTuple
            const logoHtml = best.logo
              ? `<img class="lpincard__logo" src="${esc(best.logo)}" onerror="this.style.visibility='hidden'"/>`
              : `<span class="lpincard__ini">${esc(best.company.slice(0, 1))}</span>`
            const nmHtml = entry.jobs.length > 1
              ? `${esc(best.company)} · ${entry.jobs.length}개`
              : esc(best.company)
            const saved = entry.jobs.some((p) => savedKeys.has(jobKey(p)))
            const multiCls = entry.jobs.length > 1 ? ' lpincard--multi' : ' lpincard--single'
            const html = `<div class="lpincard${multiCls}${saved ? ' lpincard--saved' : ''}"${saved ? ' style="width:150px"' : ''}>${logoHtml}<span class="lpincard__nm"${saved ? ' style="max-width:82px"' : ''}>${nmHtml}</span><span class="lpincard__mt">${best.matchPct}%</span></div>`
            const icon = L.divIcon({ className: 'lpin-wrap', html, iconSize: [saved ? 150 : entry.jobs.length > 1 ? 148 : 134, 30], iconAnchor: [(saved ? 150 : entry.jobs.length > 1 ? 148 : 134) / 2, 15] })
            const m = L.marker(latlng, { icon })
            m.on('click', () => (entry.jobs.length > 1 ? setMenu({ pins: entry.jobs }) : openPin(best)))
            group.addLayer(m)
          })
        }
      })
    }
    map.on('zoomend', draw)
    map.on('movestart zoomstart', () => setMenu(null))

    L.marker(ME, { icon: L.divIcon({ className: 'lpin-wrap', html: '<div class="lpin lpin--me"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(map)

    // 화면 내 보이는 회사 실시간 파악 (매칭순 3개 · 스켈레톤 후 갱신) + "이 지역에서 재검색" 버튼
    let tid: number | undefined
    const updateVisible = () => {
      setLoading(true)
      const b = map.getBounds()
      const vis = filteredPins.filter((p) => b.contains([p.lat, p.lng] as L.LatLngTuple))
        .sort((a, b2) => b2.matchPct - a.matchPct).slice(0, 3)
      window.clearTimeout(tid)
      tid = window.setTimeout(() => { setVisible(vis); setLoading(false) }, 320)
    }
    map.on('moveend', updateVisible)
    let destroyed = false
    const initTid = window.setTimeout(() => {
      if (destroyed) return
      map.invalidateSize(); draw(); updateVisible()
    }, 80)
    return () => {
      destroyed = true
      window.clearTimeout(tid)
      window.clearTimeout(initTid)
      map.remove()
      mapRef.current = null
    }
  }, [entries, filteredPins, savedKeys])

  const recenter = () => mapRef.current?.flyTo(ME, ZOOM_INDIV, { duration: 0.6 })
  const fitAll = () => mapRef.current?.flyToBounds(L.latLngBounds(clusters.map((c) => [c.lat, c.lng])).pad(0.15), { duration: 0.6 })

  const menuRows = useMemo(() => {
    if (!menuView) return []
    return [...menuView.pins].sort((a, b) => (menuSort === 'match' ? b.matchPct - a.matchPct : (a.dday ?? 9999) - (b.dday ?? 9999)))
  }, [menuView, menuSort])
  const menuIsSameCompany = !!menuView && menuView.pins.length > 0 && menuView.pins.every((p) => p.company === menuView.pins[0].company)

  return (
    <div className="stage stage--app">
      <PhoneFrame app stage="purple" bare screenBg={t.screenBg} statusTheme={t.statusTheme} homeIndicator="none">
        <div className="career career--map" style={{ ...themeVars(t), padding: 0, height: '100%', position: 'relative' }}>
          <div ref={elRef} className="lmap" />

          <div className="lmap__search">
            <Search size={17} />
            <input
              name="map-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              placeholder="지역 · 회사 검색"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="지우기" style={{ display: 'flex' }}><X size={15} /></button>
            )}
            <button className={`lmap__filterbtn${filterOpen ? ' on' : ''}`} onClick={() => setFilterOpen(true)} aria-label="필터">
              <SlidersHorizontal size={15} />
            </button>
          </div>

          {searchFocused && query && (
            <div className="lmap__drop">
              {searchResults.length === 0 && <div className="lmap__drop-empty">검색 결과가 없어요</div>}
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  className="lmap__drop-row"
                  onClick={() => (r.type === 'district' ? flyToDistrict(r.label) : flyToCompany(r.pin!))}
                >
                  <span className="lmap__drop-tag">{r.type === 'district' ? '지역' : '회사'}</span>
                  {r.label}
                </button>
              ))}
            </div>
          )}
          {searchFocused && <div className="lctxmenu__ov" style={{ zIndex: 5 }} onClick={() => setSearchFocused(false)} />}

          {/* 화면 내 보이는 회사 (매칭순 3) */}
          <div className="lmap__strip">
            {loading
              ? [0, 1, 2].map((i) => <MiniJobSkeleton key={i} />)
              : visible.map((p) => (
                  <MiniJobCard
                    key={p.id}
                    logo={<CompanyLogo logo={p.logo} name={p.company} size={36} radius={10} />}
                    company={p.company} matchPct={p.matchPct} onClick={() => openPin(p)}
                  />
                ))}
          </div>

          <div className="lmap__fabs">
            <button className="lfab" onClick={fitAll} aria-label="전체 보기"><Maximize2 size={19} /></button>
            <button className="lfab primary" onClick={recenter} aria-label="내 위치"><LocateFixed size={19} /></button>
          </div>

          {!searchFocused && <div className="lmap__legend">링 색 = 평균 매칭률</div>}

          {/* 필터 바텀시트 */}
          <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)}>
            <div className="cr-sheet__label" style={{ marginTop: 0 }}>기업 규모</div>
            {TIERS.map((tier) => (
              <button
                key={tier}
                className={`cr-check ${tierFilter.has(tier) ? 'on' : ''}`}
                onClick={() => setTierFilter((s) => {
                  const next = new Set(s)
                  if (next.has(tier)) next.delete(tier); else next.add(tier)
                  return next
                })}
              >
                <span className="box">{tierFilter.has(tier) && <Check size={14} strokeWidth={3} />}</span>{tier}
              </button>
            ))}
            <div className="cr-sheet__label">최소 매칭률</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MATCH_STEPS.map((v) => (
                <button key={v} className={`cr-radio ${minMatch === v ? 'on' : ''}`} onClick={() => setMinMatch(v)} style={{ flex: 'none' }}>
                  <span className="dot" /> {v === 0 ? '전체' : `${v}%+`}
                </button>
              ))}
            </div>
            <div className="cr-sheet__label">마감</div>
            <button className={`cr-check ${deadlineOnly ? 'on' : ''}`} onClick={() => setDeadlineOnly((v) => !v)}>
              <span className="box">{deadlineOnly && <Check size={14} strokeWidth={3} />}</span>7일 내 마감 임박만 보기
            </button>
            <button className="cr-sheet__apply" onClick={() => setFilterOpen(false)}>적용하기</button>
          </BottomSheet>

          {/* 지역 클릭 → 지도 바깥(외부) 탭하면 닫기 */}
          {menu && <div className="lctxmenu__ov" onClick={() => setMenu(null)} />}

          {/* 회사 마커 클릭 → 리치 시트(JobSheet) */}
          <JobSheet
            job={sel} open={!!sel} onClose={() => setSel(null)}
            onDetail={() => { if (sel) navigate(`/job/${encodeURIComponent(sel.id)}`); setSel(null) }}
          />

          <LocationPermissionSheet open={permOpen} onClose={closePerm} />

          {/* 하단 독 — 평소엔 내비게이션, 지역 클릭 시 다이나믹 아일랜드처럼
              같은 자리에서 부드럽게 확장되어 그 지역(또는 같은 회사) 공고 리스트를 보여줌 */}
          <DynamicDock
            expanded={!!menu}
            expandedWidth={330}
            expandedHeight={300}
            collapsed={
              <>
                {NAV_TABS.map(({ key, label, icon: Icon, to }) => (
                  <button
                    key={key}
                    className={`cr-nav__item${key === 'map' ? ' on' : ''}`}
                    onClick={() => key !== 'map' && navigate(to)}
                    aria-label={label}
                    aria-current={key === 'map' ? 'page' : undefined}
                  >
                    <Icon size={22} strokeWidth={key === 'map' ? 2.4 : 2} />
                  </button>
                ))}
              </>
            }
          >
            {menuView && (
              <>
                <div className="lctxmenu__hd">
                  <button className="lctxmenu__back" onClick={() => setMenu(null)} aria-label="닫기">
                    <ArrowLeft size={15} />
                  </button>
                  {menuIsSameCompany ? menuView.pins[0]?.company : (menuView.pins[0]?.district || '지역')} · {menuView.pins.length}개 공고
                </div>
                <div className="lctxmenu__sort">
                  <SegmentedControl
                    size="sm" value={menuSort} onChange={(v) => setMenuSort(v as 'match' | 'deadline')}
                    options={[{ key: 'match', label: '매칭순' }, { key: 'deadline', label: '마감임박순' }]}
                  />
                </div>
                <div className="lctxmenu__list kit-scroll">
                  {menuRows.map((p) => (
                    <button key={p.id} className="lctxmenu__row" onClick={() => openPin(p)}>
                      <CompanyLogo logo={p.logo} name={p.company} size={30} radius={9} />
                      <span className="info">
                        <span className="nm">{p.company}</span>
                        {p.tier && <span className={`cr-tier ${tierClass(p.tier)}`}>{p.tier}</span>}
                      </span>
                      {p.dday != null && <span className="dist">D-{p.dday}</span>}
                      <span className="dist">{distLabel(p)}</span>
                      <span className="mt">{p.matchPct}%</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </DynamicDock>
        </div>
      </PhoneFrame>
    </div>
  )
}
