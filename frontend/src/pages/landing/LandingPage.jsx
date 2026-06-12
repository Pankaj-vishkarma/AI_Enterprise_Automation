import { useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HeroSection from './components/sections/HeroSection';
import AIEmployeesSection from './components/sections/AIEmployeesSection';
import MultiAgentSection from './components/sections/MultiAgentSection';
import WorkflowSection from './components/sections/WorkflowSection';
import KnowledgeSection from './components/sections/KnowledgeSection';
import ResearchBrowserSection from './components/sections/ResearchBrowserSection';
import VoiceSupportSection from './components/sections/VoiceSupportSection';
import AnalyticsSection from './components/sections/AnalyticsSection';
import CTASection from './components/sections/CTASection';
import './landing.css';

export default function LandingPage() {
  useEffect(() => {
    document.documentElement.classList.add('landing-active');
    return () => document.documentElement.classList.remove('landing-active');
  }, []);

  return (
    <div className="landing-page relative min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <AIEmployeesSection />
        <MultiAgentSection />
        <WorkflowSection />
        <KnowledgeSection />
        <ResearchBrowserSection />
        <VoiceSupportSection />
        <AnalyticsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
