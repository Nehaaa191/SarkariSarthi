import Hero from '../components/Hero';
import AskSaathi from '../components/AskSaathi';
import HowItWorks from '../components/HowItWorks';
import DashboardPreview from '../components/DashboardPreview';
import TrustSection from '../components/TrustSection';
import CTASection from '../components/CTASection';

export default function Home() {
  return (
    <main>
      <Hero />
      <AskSaathi />
      <HowItWorks />
      <DashboardPreview />
      <TrustSection />
      <CTASection />
    </main>
  );
}
