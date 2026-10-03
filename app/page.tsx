import Hero from '@/components/home/Hero';
import BrandPicker from '@/components/home/BrandPicker';
import ProcessSteps from '@/components/home/ProcessSteps';
import WhyFhoneify from '@/components/home/WhyFhoneify';
import ClosingCta from '@/components/home/ClosingCta';
import TopSellingModels from '@/components/TopSellingModels';
import FAQs from '@/components/FAQs';
import WarrantyClaim from '@/components/WarrantyClaim';

// Server-rendered: the headline and the "Sell your phone" action are in the
// initial HTML. Only the hero phone tilt and the model prices hydrate.
export default function LandingPage() {
  return (
    <div className="w-full overflow-x-clip">
      <Hero />
      <BrandPicker />
      <ProcessSteps />
      <TopSellingModels />
      <WhyFhoneify />

      <section aria-labelledby="faq-title" className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <FAQs />
          <div className="lg:pt-[4.5rem]">
            <WarrantyClaim />
          </div>
        </div>
      </section>

      <ClosingCta />
    </div>
  );
}
