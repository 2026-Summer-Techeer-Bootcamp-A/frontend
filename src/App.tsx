import { Routes, Route, Navigate } from 'react-router-dom'
import DemoRemote from './career/DemoRemote'
import DemoMode from './career/DemoMode'
import Gallery from './pages/Gallery'
import P1Home from './pages/P1Home'
import P1List from './pages/P1List'
import P1Detail from './pages/P1Detail'
import P2Home from './pages/P2Home'
import P3Home from './pages/P3Home'
import P3Detail from './pages/P3Detail'
import Orbit from './pages/Orbit'
import CareerDashboard from './career/CareerDashboard'
import JobDetail from './career/JobDetail'
import MarketScreen from './career/MarketScreen'
import JobsScreen from './career/JobsScreen'
import MapScreen from './career/MapScreen'
import ResumeScreen from './career/ResumeScreen'
import ResumeSubmit from './career/ResumeSubmit'
import TechDetail from './career/TechDetail'
import CertGap from './career/CertGap'
import DesignSystemLayout from './design/DesignSystemLayout'
import DoDont from './design/DoDont'
import LikeApple from './design/LikeApple'
import IconSets from './design/IconSets'
import TossDetails from './design/TossDetails'
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

export default function App() {
  return (
    <>
    <DemoRemote />
    <DemoMode />
    <Routes>
      <Route path="/" element={<CareerDashboard />} />
      <Route path="/job/:id" element={<JobDetail />} />
      <Route path="/market" element={<MarketScreen />} />
      <Route path="/jobs" element={<JobsScreen />} />
      <Route path="/map" element={<MapScreen />} />
      <Route path="/resume" element={<ResumeScreen />} />
      <Route path="/resume/submit" element={<ResumeSubmit />} />
      <Route path="/tech/:name" element={<TechDetail />} />
      <Route path="/cert-gap" element={<CertGap />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/design-system" element={<DesignSystemLayout />}>
        <Route index element={<Navigate to="colors" replace />} />
        <Route path="guide" element={<DoDont />} />
        <Route path="apple" element={<LikeApple />} />
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
    </Routes>
    </>
  )
}
