import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LocateFixed, Maximize2 } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import PhoneFrame from '../components/PhoneFrame'
import CompanyLogo from './CompanyLogo'
import CareerTabBar from './CareerTabBar'
import JobSheet from './JobSheet'
import { MiniJobCard, MiniJobSkeleton } from './kit'
import { THEME, themeVars } from './themes'
import market from '../data/marketData.json'
import data from '../data/careerData.json'
import './career.css'
import './screens.css'

type Pin = {
  id: string; lat: number; lng: number; company: string; title: string
  district: string; matchPct: number; tier: string | null; held: number; total: number; logo: string
}
type Cluster = { district: string; count: number; avgMatch: number; lat: number; lng: number }
const MAP = market.map as { asOf: string; N: number; note: string; pins: Pin[]; clusters: Cluster[] }
const B = { latMin: 37.40, latMax: 37.72, lngMin: 126.76, lngMax: 127.20 }
const ME: [number, number] = [37.503, 127.045]
const ZOOM_INDIV = 14
type Job = (typeof data.postings)[number]

export default function MapScreen() {
  const t = THEME
  const navigate = useNavigate()
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [sel, setSel] = useState<Job | null>(null)
  const [visible, setVisible] = useState<Pin[]>([])
  const [loading, setLoading] = useState(false)
  const [menu, setMenu] = useState<{ x: number; y: number; pins: Pin[] } | null>(null)

  // 핀 → 실제 공고 찾아 리치 시트 열기
  const openPin = (p: Pin) => {
    setSel(data.postings.find((x) => x.company === p.company && x.title === p.title) ?? null)
    setMenu(null)
  }

  const pins = useMemo(() => MAP.pins.filter((p) => p.lat >= B.latMin && p.lat <= B.latMax && p.lng >= B.lngMin && p.lng <= B.lngMax), [])
  const clusters = useMemo(() => MAP.clusters.filter((c) => c.lat >= B.latMin && c.lat <= B.latMax), [])

  useEffect(() => {
    if (!elRef.current || mapRef.current) return
    const map = L.map(elRef.current, { center: [37.525, 127.02], zoom: 12, zoomControl: false, attributionControl: false })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map)
    mapRef.current = map

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    // 근접 마커 자동 클러스터링(겹침 방지). 클러스터 = 공고수 + 평균매칭 링.
    const group = L.markerClusterGroup({
      maxClusterRadius: 140,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: false,
      zoomToBoundsOnClick: false,
      chunkedLoading: true,
      iconCreateFunction: (cluster) => {
        const kids = cluster.getAllChildMarkers() as unknown as { matchPct: number; district: string }[]
        const count = kids.length
        const avg = Math.round(kids.reduce((s, m) => s + (m.matchPct || 0), 0) / count)
        // 자식들의 최빈 지역명
        const cnt: Record<string, number> = {}
        kids.forEach((m) => { if (m.district) cnt[m.district] = (cnt[m.district] || 0) + 1 })
        const dist = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || '서울'
        const sz = 46 + Math.min(30, count * 1.4)
        return L.divIcon({
          className: 'lpin-wrap',
          html: `<div class="lclus" style="width:${sz}px;height:${sz}px;background:conic-gradient(var(--c-accent) 0 ${avg}%, #d7dde7 ${avg}% 100%)"><div class="lclus__hole"><b>${count}</b><span>${esc(dist)}</span></div></div>`,
          iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2],
        })
      },
    })

    // 개별 회사 라운딩 카드: 로고 + 회사명 + 매칭%
    pins.forEach((p) => {
      const logoHtml = p.logo
        ? `<img class="lpincard__logo" src="${esc(p.logo)}" onerror="this.style.visibility='hidden'"/>`
        : `<span class="lpincard__ini">${esc(p.company.slice(0, 1))}</span>`
      const html = `<div class="lpincard">${logoHtml}<span class="lpincard__nm">${esc(p.company)}</span><span class="lpincard__mt">${p.matchPct}%</span></div>`
      const icon = L.divIcon({ className: 'lpin-wrap', html, iconSize: [134, 30], iconAnchor: [67, 15] })
      const m = L.marker([p.lat, p.lng], { icon })
      const mm = m as unknown as { matchPct: number; district: string; pin: Pin }
      mm.matchPct = p.matchPct; mm.district = p.district; mm.pin = p
      m.on('click', () => openPin(p))
      group.addLayer(m)
    })
    map.addLayer(group)

    // 클러스터 클릭: 축소 상태면 확대, 충분히 확대됐으면 그 지점에서 컨텍스트 메뉴
    const MENU_ZOOM = 14
    group.on('clusterclick', (e) => {
      const cl = (e as unknown as { layer: { getAllChildMarkers: () => unknown[]; getLatLng: () => L.LatLng } }).layer
      if (map.getZoom() < MENU_ZOOM) {
        map.flyTo(cl.getLatLng(), Math.min(16, map.getZoom() + 2), { duration: 0.5 })
        return
      }
      const kids = cl.getAllChildMarkers() as unknown as { pin: Pin }[]
      const pt = map.latLngToContainerPoint(cl.getLatLng())
      setMenu({ x: pt.x, y: pt.y, pins: kids.map((k) => k.pin) })
    })
    map.on('movestart zoomstart', () => setMenu(null))

    L.marker(ME, { icon: L.divIcon({ className: 'lpin-wrap', html: '<div class="lpin lpin--me"></div>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(map)

    // 화면 내 보이는 회사 실시간 파악 (매칭순 3개 · 스켈레톤 후 갱신)
    let tid: number | undefined
    const updateVisible = () => {
      setLoading(true)
      const b = map.getBounds()
      const vis = pins.filter((p) => b.contains([p.lat, p.lng] as L.LatLngTuple))
        .sort((a, b2) => b2.matchPct - a.matchPct).slice(0, 3)
      window.clearTimeout(tid)
      tid = window.setTimeout(() => { setVisible(vis); setLoading(false) }, 320)
    }
    map.on('moveend', updateVisible)
    setTimeout(() => { map.invalidateSize(); updateVisible() }, 80)
    return () => { window.clearTimeout(tid); map.remove(); mapRef.current = null }
  }, [pins, clusters])

  const recenter = () => mapRef.current?.flyTo(ME, ZOOM_INDIV, { duration: 0.6 })
  const fitAll = () => mapRef.current?.flyToBounds(L.latLngBounds(clusters.map((c) => [c.lat, c.lng])).pad(0.15), { duration: 0.6 })

  return (
    <div className="stage" style={{ background: t.stageBg }}>
      <PhoneFrame stage="purple" bare screenBg={t.screenBg} statusTheme={t.statusTheme} homeIndicator="none">
        <div className="career career--map" style={{ ...themeVars(t), padding: 0, height: '100%', position: 'relative' }}>
          <div ref={elRef} className="lmap" />

          <div className="lmap__search">
            <Search size={17} />
            <span>지역 · 회사 검색</span>
            <span className="lmap__searchtag">국내</span>
          </div>

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

          {/* 지역 게이지 클릭 → 컨텍스트 메뉴(그 지역 회사들) */}
          {menu && (
            <>
              <div className="lctxmenu__ov" onClick={() => setMenu(null)} />
              <div className="lctxmenu" style={{ left: menu.x, top: menu.y }}>
                <div className="lctxmenu__hd">{menu.pins[0]?.district || '지역'} · {menu.pins.length}개 공고</div>
                <div className="lctxmenu__list kit-scroll">
                  {[...menu.pins].sort((a, b) => b.matchPct - a.matchPct).map((p) => (
                    <button key={p.id} className="lctxmenu__row" onClick={() => openPin(p)}>
                      <CompanyLogo logo={p.logo} name={p.company} size={26} radius={7} />
                      <span className="nm">{p.company}</span>
                      <span className="mt">{p.matchPct}%</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 회사 마커 클릭 → 리치 시트(JobSheet) */}
          <JobSheet
            job={sel} open={!!sel} onClose={() => setSel(null)}
            onDetail={() => { if (sel) navigate(`/job/${data.postings.indexOf(sel)}`); setSel(null) }}
          />

          <CareerTabBar active="map" />
        </div>
      </PhoneFrame>
    </div>
  )
}
