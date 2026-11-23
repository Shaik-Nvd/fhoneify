import HeroStage from './HeroStage';

// Full-width hero on the page's own theme colours (cream in light, near-black
// in dark). Everything decorative is drawn from theme tokens, so both themes
// look designed. The headline is server-rendered; the stage hydrates on top.
export default function Hero() {
  return (
    <section data-hero aria-labelledby="hero-title" className="relative isolate overflow-hidden border-b border-border">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-glow absolute -right-[20%] -top-[30%] aspect-square w-[min(1200px,140vw)] rounded-full" />
        {/* Editorial hairline frame */}
        <div className="hero-frame absolute inset-0 mx-auto max-w-7xl">
          <span className="absolute inset-y-0 left-6 hidden w-px md:block" />
          <span className="absolute inset-y-0 right-6 hidden w-px md:block" />
          <span className="absolute inset-y-0 left-[52%] hidden w-px lg:block" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-8 pt-8 sm:pt-12 md:px-10 lg:pb-12 lg:pt-14">
        <HeroStage />
      </div>
    </section>
  );
}
