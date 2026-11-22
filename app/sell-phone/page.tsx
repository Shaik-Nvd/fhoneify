import type { Metadata } from 'next';
import Hero from '@/components/home/Hero';
import BrandPicker from '@/components/home/BrandPicker';
import ProcessSteps from '@/components/home/ProcessSteps';
import SellCompare from '@/components/home/SellCompare';
import WhyFhoneify from '@/components/home/WhyFhoneify';
import ClosingCta from '@/components/home/ClosingCta';
import { RevealBoot, RevealObserver } from '@/components/home/Reveal';
import FAQs from '@/components/FAQs';

export const metadata: Metadata = {
  title: 'Sell Your Old Phone in Bengaluru',
  description:
    'Get an instant price for your old phone, book a free doorstep pickup anywhere in Bengaluru and get paid instantly via UPI once it is verified.',
  openGraph: {
    title: 'Sell your old phone. Get paid at your door.',
    description: 'Instant quote, free doorstep pickup across Bengaluru, paid via UPI on the spot.',
    type: 'website',
  },
};

/**
 * Landing page for paid ads: only the selling story, every action leads to
 * the /quote flow. Same sections as the home page, without the buy pitch.
 */
export default function SellPhoneLandingPage() {
  return (
    <div className="w-full overflow-x-clip">
      <RevealBoot />
      <Hero />
      <ProcessSteps />
      <BrandPicker />
      <SellCompare />
      <WhyFhoneify />

      <section aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-20">
        <div data-reveal>
          <FAQs />
        </div>
      </section>

      <ClosingCta showBuyLink={false} />
      <RevealObserver />
    </div>
  );
}
