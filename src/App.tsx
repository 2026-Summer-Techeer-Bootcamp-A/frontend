import { Routes, Route } from 'react-router-dom'
import DemoRemote from './career/DemoRemote'
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
import DesignSystem from './design/DesignSystem'
import DoDont from './design/DoDont'
import LikeApple from './design/LikeApple'
import IconSets from './design/IconSets'
import TossDetails from './design/TossDetails'
import WidgetsDemo from './pages/widgets/WidgetsDemo'

export default function App() {
  return (
    <>
    <DemoRemote />
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
      <Route path="/design-system" element={<DesignSystem />} />
      <Route path="/design-system/guide" element={<DoDont />} />
      <Route path="/design-system/apple" element={<LikeApple />} />
      <Route path="/design-system/icons" element={<IconSets />} />
      <Route path="/design-system/toss" element={<TossDetails />} />
      <Route path="/widgets" element={<WidgetsDemo />} />
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
