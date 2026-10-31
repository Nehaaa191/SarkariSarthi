import React from 'react';
import Hero from '../components/Hero';
import AskSaathi from '../components/AskSaathi';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import DashboardPreview from '../components/DashboardPreview';
import TrustSection from '../components/TrustSection';
import CTASection from '../components/CTASection';

export default function Home() {
  return (
    <main>
      <Hero />
      <AskSaathi />
      <Features />
      <HowItWorks />
      <DashboardPreview />
      <TrustSection />
      <CTASection />
    </main>
  );
}
