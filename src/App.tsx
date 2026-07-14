import { Routes, Route, Navigate } from 'react-router-dom'
import DemoRemote from './career/DemoRemote'
import Gallery from './pages/Gallery'
import P1Home from './pages/P1Home'
import P1List from './pages/P1List'
import P1Detail from './pages/P1Detail'
import P2Home from './pages/P2Home'
import P3Home from './pages/P3Home'
import P3Detail from './pages/P3Detail'
import Orbit from './pages/Orbit'
import RefBotrix from './pages/RefBotrix'
import RefEducation from './pages/RefEducation'
import RefMysales from './pages/RefMysales'
import RefHom from './pages/RefHom'
import Signal from './pages/Signal'
import SignalNetwork from './pages/SignalNetwork'
import SignalTrend from './pages/SignalTrend'
import SignalConceptTrend from './pages/SignalConceptTrend'
import SignalConceptBridge from './pages/SignalConceptBridge'
import SignalConcept from './pages/SignalConcept'
import SignalCompetency from './pages/SignalCompetency'
import SignalFeed from './pages/SignalFeed'
import SignalUnlock from './pages/SignalUnlock'
import SignalSkillTree from './pages/SignalSkillTree'
import CareerDashboard from './career/CareerDashboard'
import JobDetail from './career/JobDetail'
import MarketScreen from './career/MarketScreen'
import JobsScreen from './career/JobsScreen'
import ResumeScreen from './career/ResumeScreen'
import ResumeSubmit from './career/ResumeSubmit'
import TechDetail from './career/TechDetail'
import CertGap from './career/CertGap'
// 자잘한 화면 세트 — 인증(A) · 설정(B) · 시스템 상태(C)
import SplashScreen from './career/auth/SplashScreen'
import LoginScreen from './career/auth/LoginScreen'
import SignupScreen from './career/auth/SignupScreen'
import SettingsHome from './career/settings/SettingsHome'
import SettingsAccount from './career/settings/SettingsAccount'
import SettingsNotifications from './career/settings/SettingsNotifications'
import SettingsDisplay from './career/settings/SettingsDisplay'
import SettingsLegal from './career/settings/SettingsLegal'
import SettingsAbout from './career/settings/SettingsAbout'
import NotFoundScreen, { StatesGallery, OfflineScreen } from './career/states'
import DesignSystemLayout from './design/DesignSystemLayout'
import DoDont from './design/DoDont'
import LikeApple from './design/LikeApple'
import IconSets from './design/IconSets'
import TossDetails from './design/TossDetails'
import AppleMotion from './design/reference/AppleMotion'
import KitSection from './design/sections/KitSection'
import ColorsSection from './design/sections/ColorsSection'
import TypographySection from './design/sections/TypographySection'
import TokensSection from './design/sections/TokensSection'
import MotionSection from './design/sections/MotionSection'
import ButtonsSection from './design/sections/ButtonsSection'
import InputsSection from './design/sections/InputsSection'
import FormsSection from './design/sections/FormsSection'
import ChipsSection from './design/sections/ChipsSection'
import DataVizSection from './design/sections/DataVizSection'
import DataDisplaySection from './design/sections/DataDisplaySection'
import FeedbackSection from './design/sections/FeedbackSection'
import NavSection from './design/sections/NavSection'
import CardsSection from './design/sections/CardsSection'
import MapSection from './design/sections/MapSection'
import StatsSection from './design/sections/StatsSection'
import InsightsSection from './design/sections/InsightsSection'
import WidgetsLayout from './pages/widgets/WidgetsLayout'
import WidgetA from './pages/widgets/WidgetA'
import WidgetC from './pages/widgets/WidgetC'
import WidgetY1 from './pages/widgets/WidgetY1'
import WidgetY2 from './pages/widgets/WidgetY2'
import WidgetG from './pages/widgets/WidgetG'
import WidgetH from './pages/widgets/WidgetH'
import WidgetK from './pages/widgets/WidgetK'
import WidgetO from './pages/widgets/WidgetO'
import WidgetN from './pages/widgets/WidgetN'
import WidgetP from './pages/widgets/WidgetP'
import WidgetL from './pages/widgets/WidgetL'
import WidgetR from './pages/widgets/WidgetR'
import WidgetS from './pages/widgets/WidgetS'
import WidgetT from './pages/widgets/WidgetT'
import WidgetU from './pages/widgets/WidgetU'
import WidgetY4 from './pages/widgets/WidgetY4'
import WidgetX from './pages/widgets/WidgetX'
import RagDocs from './rag/RagDocs'
import AssistantWorkspace from './rag/AssistantWorkspace'
import ResponsiveProductLayout from './shared/ResponsiveProductLayout'
import Adaptive from './shared/Adaptive'
import DesktopOverview from './desktop/pages/DesktopOverview'
import DesktopHome from './desktop/pages/home/DesktopHome'
import { DesktopJobs, DesktopMarket, DesktopMy } from './desktop/pages/placeholders'

export default function App() {
  return (
    <>
    <DemoRemote />
    <Routes>
      {/* ─────────────────────────────────────────────────────────────
          제품(Product) — 반응형 셸 스왑.
          데스크톱(>=1024px): DesktopShell(사이드바+톱바)이 감싸고 본문은 데스크톱 페이지.
          모바일: 기존 폰 화면(자체 프레임)을 그대로 렌더. Adaptive가 폭으로 본문을 스왑한다.
          ───────────────────────────────────────────────────────────── */}
      {/* 제품 라우트 — 데스크톱(>=1024): 사이드바 셸 + 데스크톱 페이지.
          모바일: 프레임리스 모바일 화면. Adaptive가 폭으로 본문을 스왑한다. */}
      <Route element={<ResponsiveProductLayout />}>
        <Route path="/" element={<Adaptive mobile={CareerDashboard} desktop={DesktopOverview} />} />
        <Route path="/home" element={<DesktopHome />} />
        <Route path="/jobs" element={<Adaptive mobile={JobsScreen} desktop={DesktopJobs} />} />
        <Route path="/market" element={<Adaptive mobile={MarketScreen} desktop={DesktopMarket} />} />
        <Route path="/resume" element={<Adaptive mobile={ResumeScreen} desktop={DesktopMy} />} />
        {/* 아직 모바일 스타일 화면 — 데스크톱에선 셸 안에서 렌더되고, 페이지 데스크톱화는 다음 단계 */}
        <Route path="/resume/submit" element={<ResumeSubmit />} />
        <Route path="/resume/new" element={<ResumeSubmit />} />
        <Route path="/resume/:id/edit" element={<ResumeSubmit />} />
        <Route path="/cert-gap" element={<CertGap />} />
        <Route path="/settings" element={<SettingsHome />} />
        <Route path="/settings/account" element={<SettingsAccount />} />
        <Route path="/settings/notifications" element={<SettingsNotifications />} />
        <Route path="/settings/display" element={<SettingsDisplay />} />
        <Route path="/settings/terms" element={<SettingsLegal kind="terms" />} />
        <Route path="/settings/privacy" element={<SettingsLegal kind="privacy" />} />
        <Route path="/settings/about" element={<SettingsAbout />} />
        {/* 제품 상세 — 데스크톱 마스터-디테일 전환은 Phase 3. 지금은 모바일 화면 유지. */}
        <Route path="/job/:id" element={<JobDetail />} />
        <Route path="/tech/:name" element={<TechDetail />} />
        <Route path="/states" element={<StatesGallery />} />
        <Route path="/assistant" element={<AssistantWorkspace />} />
      </Route>

      {/* ─── 자잘한 화면 세트: 인증 · 시스템 상태 (선택적 게이팅) ─── */}
      <Route path="/splash" element={<SplashScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/signup" element={<SignupScreen />} />
      <Route path="/offline" element={<OfflineScreen />} />

      {/* ─────────────────────────────────────────────────────────────
          실험실(Lab) — 데모 · 디자인시스템 · 위젯 · RAG 문서. 제품 IA가 아님.
          ───────────────────────────────────────────────────────────── */}
      <Route path="/rag-docs" element={<RagDocs />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/design-system" element={<DesignSystemLayout />}>
        <Route index element={<Navigate to="guide" replace />} />
        <Route path="guide" element={<DoDont />} />
        <Route path="apple" element={<LikeApple />} />
        <Route path="apple-motion" element={<AppleMotion />} />
        <Route path="icons" element={<IconSets />} />
        <Route path="toss" element={<TossDetails />} />
        <Route path="kit" element={<KitSection />} />
        <Route path="colors" element={<ColorsSection />} />
        <Route path="typography" element={<TypographySection />} />
        <Route path="tokens" element={<TokensSection />} />
        <Route path="motion" element={<MotionSection />} />
        <Route path="buttons" element={<ButtonsSection />} />
        <Route path="inputs" element={<InputsSection />} />
        <Route path="forms" element={<FormsSection />} />
        <Route path="chips" element={<ChipsSection />} />
        <Route path="data" element={<DataVizSection />} />
        <Route path="datadisplay" element={<DataDisplaySection />} />
        <Route path="feedback" element={<FeedbackSection />} />
        <Route path="nav" element={<NavSection />} />
        <Route path="cards" element={<CardsSection />} />
        <Route path="map" element={<MapSection />} />
        <Route path="stats" element={<StatsSection />} />
        <Route path="insights" element={<InsightsSection />} />
      </Route>
      <Route path="/widgets" element={<WidgetsLayout />}>
        <Route index element={<Navigate to="a" replace />} />
        <Route path="a" element={<WidgetA />} />
        <Route path="c" element={<WidgetC />} />
        <Route path="y1" element={<WidgetY1 />} />
        <Route path="y2" element={<WidgetY2 />} />
        <Route path="g" element={<WidgetG />} />
        <Route path="h" element={<WidgetH />} />
        <Route path="k" element={<WidgetK />} />
        <Route path="o" element={<WidgetO />} />
        <Route path="n" element={<WidgetN />} />
        <Route path="p" element={<WidgetP />} />
        <Route path="l" element={<WidgetL />} />
        <Route path="r" element={<WidgetR />} />
        <Route path="s" element={<WidgetS />} />
        <Route path="t" element={<WidgetT />} />
        <Route path="u" element={<WidgetU />} />
        <Route path="y4" element={<WidgetY4 />} />
        <Route path="x" element={<WidgetX />} />
      </Route>
      <Route path="/p1-home" element={<P1Home />} />
      <Route path="/p1-list" element={<P1List />} />
      <Route path="/p1-detail" element={<P1Detail />} />
      <Route path="/p2-home" element={<P2Home />} />
      <Route path="/p3-home" element={<P3Home />} />
      <Route path="/p3-detail" element={<P3Detail />} />
      <Route path="/orbit" element={<Orbit />} />
      <Route path="/ref-botrix" element={<RefBotrix />} />
      <Route path="/ref-education" element={<RefEducation />} />
      <Route path="/ref-mysales" element={<RefMysales />} />
      <Route path="/ref-hom" element={<RefHom />} />
      <Route path="/signal" element={<Signal />} />
      <Route path="/signal/network" element={<SignalNetwork />} />
      <Route path="/signal/trend" element={<SignalTrend />} />
      <Route path="/signal/concept" element={<SignalConcept />} />
      <Route path="/signal/concept-trend" element={<SignalConceptTrend />} />
      <Route path="/signal/concept-bridge" element={<SignalConceptBridge />} />
      <Route path="/signal/competency" element={<SignalCompetency />} />
      <Route path="/signal/feed" element={<SignalFeed />} />
      <Route path="/signal/unlock" element={<SignalUnlock />} />
      <Route path="/signal/skilltree" element={<SignalSkillTree />} />

      {/* 매칭되지 않는 모든 경로 → 404 */}
      <Route path="*" element={<NotFoundScreen />} />
    </Routes>
    </>
  )
}
