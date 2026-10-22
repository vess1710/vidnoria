import HeroSection from '@/components/home/HeroSection';
import PlatformsSection from '@/components/home/PlatformsSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import FeaturesSection from '@/components/home/FeaturesSection';
import FAQSection from '@/components/home/FAQSection';
import AdSlot from '@/components/ads/AdSlot';

export default async function HomePage() {
  return (
    <>
      <HeroSection />

      {/* Top Banner Ad under Hero */}
      <div className="container-custom py-4">
        <AdSlot
          slotId="home-top-banner"
          format="horizontal"
          label="Ana Sayfa Üst Banner Reklam (728×90)"
        />
      </div>

      <PlatformsSection />
      <HowItWorksSection />

      {/* Middle Banner Ad */}
      <div className="container-custom py-4">
        <AdSlot
          slotId="home-mid-banner"
          format="horizontal"
          label="İçerik Arası Banner Reklam (728×90)"
        />
      </div>

      <FeaturesSection />
      <FAQSection />
    </>
  );
}
