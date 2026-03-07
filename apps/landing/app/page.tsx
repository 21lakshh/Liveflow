'use client';
import BackgroundParticles from "@/components/landing/BackgroundParticles";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import LiveFlowDemo from "@/components/landing/LiveflowDemo";
import Navbar from "@/components/landing/Navbar";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
      <BackgroundParticles />
      <Navbar />
      <HeroSection />
      <LiveFlowDemo />
      <HowItWorks />
      <FinalCTA />
      <Footer />
    </div>
  );
}
