import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

// Brand names must match the quote flow's brand list; logos are local assets.
const HOME_BRANDS = [
  { name: 'Apple', logo: '/images/brands/apple.png' },
  { name: 'Samsung', logo: '/images/brands/samsung.png' },
  { name: 'OnePlus', logo: '/images/brands/oneplus.png' },
  { name: 'Xiaomi', logo: '/images/brands/xiaomi.png' },
  { name: 'Vivo', logo: '/images/brands/vivo.png' },
  { name: 'Oppo', logo: '/images/brands/oppo.png' },
  { name: 'Google', logo: '/images/brands/google.png' },
  { name: 'Realme', logo: '/images/brands/realme.png' },
  { name: 'iQOO', logo: '/images/brands/iqoo.png' },
  { name: 'POCO', logo: '/images/brands/poco.png' },
  { name: 'Nothing', logo: '/images/brands/nothing.png' },
];

export default function BrandPicker() {
  return (
    <section aria-labelledby="brand-picker-title" className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="brand-picker-title" className="font-display text-[1.9rem] font-medium leading-tight tracking-[-0.02em] text-foreground md:text-[2.5rem]">
            Which phone are you selling?
          </h2>
          <p className="mt-2 text-muted">Pick the brand to start your quote.</p>
        </div>
      </div>

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {HOME_BRANDS.map((brand) => (
          <li key={brand.name}>
            <Link
              href={`/quote?brand=${encodeURIComponent(brand.name)}`}
              className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-3 pb-3.5 text-foreground no-underline shadow-token-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-gold hover:text-foreground hover:shadow-token-md sm:p-4"
            >
              <span className="flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
                <Image src={brand.logo} alt="" width={96} height={96} className="h-[74%] w-auto object-contain" />
              </span>
              <span className="text-sm font-semibold">{brand.name}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/quote"
            className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-4 text-center text-sm font-semibold text-gold no-underline transition-colors hover:border-gold hover:bg-gold-soft hover:text-gold"
          >
            All brands
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </li>
      </ul>
    </section>
  );
}
