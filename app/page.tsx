import Hero from '@/components/home/Hero';
import AutoDetectDeviceBanner from '@/components/home/AutoDetectDeviceBanner';
import BrandPicker from '@/components/home/BrandPicker';
import ProcessSteps from '@/components/home/ProcessSteps';
import SellCompare from '@/components/home/SellCompare';
import WhyFhoneify from '@/components/home/WhyFhoneify';
import ClosingCta from '@/components/home/ClosingCta';
import { RevealBoot, RevealObserver } from '@/components/home/Reveal';
import FAQs from '@/components/FAQs';
import WarrantyClaim from '@/components/WarrantyClaim';

// Server-rendered: the headline and the "Get instant quote" action are in the
// initial HTML. The hero stage (phone, live prices, model rail) and the
// scroll reveals hydrate on top. Popular-model prices now live in the hero.
export default function LandingPage() {
  return (
    <div className="w-full overflow-x-clip">
      <RevealBoot />
      <Hero />
      <AutoDetectDeviceBanner />
      <BrandPicker />
      <ProcessSteps />
      <SellCompare />
      <WhyFhoneify />

      <section aria-labelledby="faq-title" className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <div data-reveal className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <FAQs />
          <div className="lg:pt-[4.5rem]">
            <WarrantyClaim />
          </div>
        </div>
      </section>

      <ClosingCta />
      <RevealObserver />
    </div>
  );
}
