import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ResponsiveProductLayout from './shared/ResponsiveProductLayout'
import Adaptive from './shared/Adaptive'
import DefaultLoader from './shared/DefaultLoader'

// ─── 무거운 메인 서비스 페이지 ───
const MarketScreen = lazy(() => import('./career/MarketScreen'))
const JobsScreen = lazy(() => import('./career/JobsScreen'))
const ResumeScreen = lazy(() => import('./career/ResumeScreen'))
const AssistantWorkspace = lazy(() => import('./rag/AssistantWorkspace'))
const DesktopOverview = lazy(() => import('./desktop/pages/DesktopOverview'))
const DesktopHome = lazy(() => import('./desktop/pages/home/DesktopHome'))
const DesignSystemLayout = lazy(() => import('./design/DesignSystemLayout'))
const WidgetsLayout = lazy(() => import('./pages/widgets/WidgetsLayout'))

// placeholders 파일 내의 모의 페이지 컴포넌트들
const DesktopJobs = lazy(() => import('./desktop/pages/placeholders').then(m => ({ default: m.DesktopJobs })))
const DesktopMarket = lazy(() => import('./desktop/pages/placeholders').then(m => ({ default: m.DesktopMarket })))
const DesktopMy = lazy(() => import('./desktop/pages/placeholders').then(m => ({ default: m.DesktopMy })))

// ─── 실험실/기타 페이지 (App.tsx 엔트리 경량화를 위해 전부 lazy 로딩) ───
const Gallery = lazy(() => import('./pages/Gallery'))
const P1Home = lazy(() => import('./pages/P1Home'))
const P1List = lazy(() => import('./pages/P1List'))
const P1Detail = lazy(() => import('./pages/P1Detail'))
const P2Home = lazy(() => import('./pages/P2Home'))
const P3Home = lazy(() => import('./pages/P3Home'))
const P3Detail = lazy(() => import('./pages/P3Detail'))
const Orbit = lazy(() => import('./pages/Orbit'))
const RefBotrix = lazy(() => import('./pages/RefBotrix'))
const RefEducation = lazy(() => import('./pages/RefEducation'))
const RefMysales = lazy(() => import('./pages/RefMysales'))
const RefHom = lazy(() => import('./pages/RefHom'))

const Signal = lazy(() => import('./pages/Signal'))
const SignalNetwork = lazy(() => import('./pages/SignalNetwork'))
const SignalTrend = lazy(() => import('./pages/SignalTrend'))
const SignalConcept = lazy(() => import('./pages/SignalConcept'))
const SignalConceptTrend = lazy(() => import('./pages/SignalConceptTrend'))
const SignalConceptBridge = lazy(() => import('./pages/SignalConceptBridge'))
const SignalCompetency = lazy(() => import('./pages/SignalCompetency'))
const SignalFeed = lazy(() => import('./pages/SignalFeed'))
const SignalUnlock = lazy(() => import('./pages/SignalUnlock'))
const SignalSkillTree = lazy(() => import('./pages/SignalSkillTree'))

const CareerDashboard = lazy(() => import('./career/CareerDashboard'))
const JobDetail = lazy(() => import('./career/JobDetail'))
const TechDetail = lazy(() => import('./career/TechDetail'))
const CertGap = lazy(() => import('./career/CertGap'))

const SplashScreen = lazy(() => import('./career/auth/SplashScreen'))
const LoginScreen = lazy(() => import('./career/auth/LoginScreen'))
const SignupScreen = lazy(() => import('./career/auth/SignupScreen'))
const SettingsHome = lazy(() => import('./career/settings/SettingsHome'))
const SettingsAccount = lazy(() => import('./career/settings/SettingsAccount'))
const SettingsNotifications = lazy(() => import('./career/settings/SettingsNotifications'))
const SettingsDisplay = lazy(() => import('./career/settings/SettingsDisplay'))
const SettingsLegal = lazy(() => import('./career/settings/SettingsLegal'))
const SettingsAbout = lazy(() => import('./career/settings/SettingsAbout'))
const NotFoundScreen = lazy(() => import('./career/states'))
const StatesGallery = lazy(() => import('./career/states').then(m => ({ default: m.StatesGallery })))
const OfflineScreen = lazy(() => import('./career/states').then(m => ({ default: m.OfflineScreen })))

// 디자인 시스템 세부 섹션 컴포넌트
const DoDont = lazy(() => import('./design/DoDont'))
const LikeApple = lazy(() => import('./design/LikeApple'))
const IconSets = lazy(() => import('./design/IconSets'))
const TossDetails = lazy(() => import('./design/TossDetails'))
const AppleMotion = lazy(() => import('./design/reference/AppleMotion'))
const KitSection = lazy(() => import('./design/sections/KitSection'))
const ColorsSection = lazy(() => import('./design/sections/ColorsSection'))
const TypographySection = lazy(() => import('./design/sections/TypographySection'))
const TokensSection = lazy(() => import('./design/sections/TokensSection'))
const MotionSection = lazy(() => import('./design/sections/MotionSection'))
const ButtonsSection = lazy(() => import('./design/sections/ButtonsSection'))
const InputsSection = lazy(() => import('./design/sections/InputsSection'))
const FormsSection = lazy(() => import('./design/sections/FormsSection'))
const ChipsSection = lazy(() => import('./design/sections/ChipsSection'))
const DataVizSection = lazy(() => import('./design/sections/DataVizSection'))
const DataDisplaySection = lazy(() => import('./design/sections/DataDisplaySection'))
const FeedbackSection = lazy(() => import('./design/sections/FeedbackSection'))
const NavSection = lazy(() => import('./design/sections/NavSection'))
const CardsSection = lazy(() => import('./design/sections/CardsSection'))
const MapSection = lazy(() => import('./design/sections/MapSection'))
const StatsSection = lazy(() => import('./design/sections/StatsSection'))
const InsightsSection = lazy(() => import('./design/sections/InsightsSection'))

// 위젯 세부 컴포넌트
const WidgetA = lazy(() => import('./pages/widgets/WidgetA'))
const WidgetC = lazy(() => import('./pages/widgets/WidgetC'))
const WidgetY1 = lazy(() => import('./pages/widgets/WidgetY1'))
const WidgetY2 = lazy(() => import('./pages/widgets/WidgetY2'))
const WidgetG = lazy(() => import('./pages/widgets/WidgetG'))
const WidgetH = lazy(() => import('./pages/widgets/WidgetH'))
const WidgetK = lazy(() => import('./pages/widgets/WidgetK'))
const WidgetO = lazy(() => import('./pages/widgets/WidgetO'))
const WidgetN = lazy(() => import('./pages/widgets/WidgetN'))
const WidgetP = lazy(() => import('./pages/widgets/WidgetP'))
const WidgetL = lazy(() => import('./pages/widgets/WidgetL'))
const WidgetR = lazy(() => import('./pages/widgets/WidgetR'))
const WidgetS = lazy(() => import('./pages/widgets/WidgetS'))
const WidgetT = lazy(() => import('./pages/widgets/WidgetT'))
const WidgetU = lazy(() => import('./pages/widgets/WidgetU'))
const WidgetY4 = lazy(() => import('./pages/widgets/WidgetY4'))
const WidgetX = lazy(() => import('./pages/widgets/WidgetX'))

const RagDocs = lazy(() => import('./rag/RagDocs'))
const PptVisualMaker = lazy(() => import('./ppt/PptVisualMaker'))

import { LoginModalProvider } from './career/LoginModalContext'

export default function App() {
  return (
    <LoginModalProvider>
      <Suspense fallback={<DefaultLoader size="large" />}>
        <Routes>
        {/* ─────────────────────────────────────────────────────────────
            제품(Product) — 반응형 셸 스왑.
            데스크톱(>=1024px): DesktopShell(사이드바+톱바)이 감싸고 본문은 데스크톱 페이지.
            모바일: 기존 폰 화면(자체 프레임)을 그대로 렌더. Adaptive가 폭으로 본문을 스왑한다.
            ───────────────────────────────────────────────────────────── */}
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

        {/* ─── 자잘한 화면 세트: 인증 · 시스템 상태 ─── */}
        <Route path="/splash" element={<SplashScreen />} />
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/offline" element={<OfflineScreen />} />

        {/* ─────────────────────────────────────────────────────────────
            실험실(Lab) — 데모 · 디자인시스템 · 위젯 · RAG 문서. 제품 IA가 아님.
            ───────────────────────────────────────────────────────────── */}
        <Route path="/rag-docs" element={<RagDocs />} />
        <Route path="/ppt-visual-maker" element={<PptVisualMaker />} />
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
    </Suspense>
    </LoginModalProvider>
  )
}

const ResumeSubmit = lazy(() => import('./career/ResumeSubmit'))
