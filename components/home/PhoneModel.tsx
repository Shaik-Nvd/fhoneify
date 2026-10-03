import { forwardRef } from 'react';
import { Check, Smartphone, Truck, Wallet, Zap } from 'lucide-react';

// Number of stacked layers that form the phone's metal frame. Each sits a
// little further back in Z, so a gentle tilt reveals a real edge.
const EDGE_LAYERS = 9;

/**
 * Static CSS-3D phone. Renders fully on the server and is the designed
 * fallback for touch devices, reduced motion and script failures; HeroPhone
 * only adds pointer tilt on top of it by setting --rx/--ry on the rig.
 */
const PhoneModel = forwardRef<HTMLDivElement>(function PhoneModel(_props, rigRef) {
  return (
    <div className="phone-stage relative mx-auto flex w-full items-center justify-center" aria-hidden="true">
      {/* Backdrop: brass halo, orbit rings and a floor shadow. No blur filters. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[118%] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--gold)_22%,transparent),transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[92%] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color-mix(in_srgb,var(--gold)_22%,transparent)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[66%] max-w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[color-mix(in_srgb,var(--gold)_18%,transparent)]" />
      <div className="pointer-events-none absolute bottom-[2%] left-1/2 h-10 w-[58%] max-w-[260px] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(0,0,0,0.38),transparent)] dark:bg-[radial-gradient(closest-side,rgba(0,0,0,0.85),transparent)]" />

      <div className="phone-enter relative" style={{ transformStyle: 'preserve-3d' }}>
        <div ref={rigRef} className="phone-rig relative">
          <div
            className="phone-device relative"
            style={
              {
                '--phone-radius': 'calc(var(--pw) * 0.16)',
                width: 'var(--pw)',
                height: 'calc(var(--pw) * 2.06)',
                fontSize: 'calc(var(--pw) * 0.046)',
              } as React.CSSProperties
            }
          >
            {/* Metal frame thickness */}
            {Array.from({ length: EDGE_LAYERS }).map((_, i) => (
              <div
                key={i}
                className="phone-layer phone-edge"
                style={{ transform: `translateZ(${-(i + 1) * 1.15}px)`, filter: i === EDGE_LAYERS - 1 ? 'brightness(0.55)' : undefined }}
              />
            ))}

            {/* Front glass */}
            <div className="phone-layer bg-[#050505] p-[3.4%] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)]" style={{ transform: 'translateZ(0.5px)' }}>
              <div className="relative h-full w-full overflow-hidden rounded-[calc(var(--phone-radius)*0.86)] bg-[#0e0d0b]">
                <PhoneScreen />
                <div className="phone-glare absolute inset-0" />
              </div>
            </div>

            {/* Floating facts at different depths */}
            <Chip className="-left-[34%] top-[16%]" z={70} icon={<Zap className="h-[1.1em] w-[1.1em]" />} label="Instant quote" />
            <Chip className="-right-[40%] top-[66%]" z={95} icon={<Truck className="h-[1.1em] w-[1.1em]" />} label="Free doorstep pickup" />
            <Chip className="-left-[26%] bottom-[9%]" z={55} icon={<Wallet className="h-[1.1em] w-[1.1em]" />} label="Paid at pickup" />
          </div>
        </div>
      </div>
    </div>
  );
});

export default PhoneModel;

function Chip({ className, z, icon, label }: { className: string; z: number; icon: React.ReactNode; label: string }) {
  return (
    <div
      className={`phone-chip absolute flex items-center gap-[0.55em] whitespace-nowrap rounded-[0.9em] border border-border bg-background px-[0.85em] py-[0.6em] text-[0.82em] font-semibold text-foreground shadow-lg ${className}`}
      style={{ '--z': `${z}px` } as React.CSSProperties}
    >
      <span className="flex h-[1.9em] w-[1.9em] items-center justify-center rounded-full bg-gold-soft text-gold">{icon}</span>
      {label}
    </div>
  );
}

/** The phone's screen: a quiet preview of the quote flow. No prices shown. */
function PhoneScreen() {
  const steps = [
    { label: 'Device selected', done: true },
    { label: 'Condition checked', done: true },
    { label: 'Pickup slot', done: false },
  ];
  return (
    <div className="flex h-full flex-col px-[7%] pb-[7%] pt-[5%] text-[#f5f2ea]">
      <div className="flex items-center justify-between text-[0.62em] font-semibold text-white/80">
        <span className="tabular">9:41</span>
        <span className="h-[1.6em] w-[30%] rounded-full bg-black" />
        <span className="flex gap-[0.25em]">
          <span className="h-[0.55em] w-[0.55em] rounded-full bg-white/70" />
          <span className="h-[0.55em] w-[0.55em] rounded-full bg-white/70" />
          <span className="h-[0.55em] w-[1.2em] rounded-[0.2em] bg-white/70" />
        </span>
      </div>

      <p className="mt-[8%] text-[0.62em] font-bold uppercase tracking-[0.28em] text-[#d4af37]">Fhoneify</p>
      <p className="font-display mt-[4%] text-[1.55em] leading-[1.1] text-white">Sell your phone</p>

      <div className="mt-[8%] flex items-center gap-[0.7em] rounded-[0.9em] border border-white/10 bg-white/[0.04] p-[0.8em]">
        <span className="flex h-[2.4em] w-[2.4em] items-center justify-center rounded-[0.6em] bg-[#d4af37]/15 text-[#d4af37]">
          <Smartphone className="h-[1.3em] w-[1.3em]" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[0.78em] font-semibold">iPhone 14 Pro</span>
          <span className="text-[0.64em] text-white/55">128 GB</span>
        </span>
      </div>

      <ul className="mt-[7%] flex flex-col gap-[0.75em]">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-[0.65em] text-[0.7em]">
            <span
              className={`flex h-[1.7em] w-[1.7em] items-center justify-center rounded-full ${
                s.done ? 'bg-[#d4af37] text-[#15110a]' : 'border border-white/25'
              }`}
            >
              {s.done && <Check className="h-[1em] w-[1em]" strokeWidth={3} />}
            </span>
            <span className={s.done ? 'text-white/90' : 'text-white/55'}>{s.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-[8%] rounded-[0.9em] border border-white/10 bg-white/[0.04] p-[0.8em]">
        <p className="text-[0.6em] font-semibold uppercase tracking-[0.18em] text-white/50">Condition</p>
        <dl className="mt-[0.6em] flex flex-col gap-[0.5em] text-[0.68em]">
          {[
            ['Screen', 'Flawless'],
            ['Body', 'Minor scratches'],
            ['Accessories', 'Charger, box'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-[0.6em]">
              <dt className="text-white/55">{k}</dt>
              <dd className="font-medium text-white/90">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-auto">
        <div className="h-[0.35em] w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-2/3 rounded-full bg-[#d4af37]" />
        </div>
        <div className="mt-[0.9em] flex h-[2.7em] items-center justify-center rounded-[0.8em] bg-[#d4af37] text-[0.72em] font-bold text-[#15110a]">
          Schedule pickup
        </div>
      </div>
    </div>
  );
}
