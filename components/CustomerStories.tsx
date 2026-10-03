const TESTIMONIALS = [
  {
    id: 1,
    quote: "I loved that Fhoneify picked up my phone from my home and paid me instantly. It was super convenient since I'm always busy.",
    author: "Ratikant Gokhale",
    location: "Koramangala",
  },
  {
    id: 2,
    quote: "I tried selling my phone locally, but didn't have any luck as everyone was trying to exploit the price. Fhoneify helped me sell it in just minutes without any stress.",
    author: "Harpreet Singh",
    location: "Indiranagar",
  },
  {
    id: 3,
    quote: "My phone was in good condition, and I was surprised that Fhoneify offered me more than I expected. Really happy with the deal.",
    author: "Bagesh Kumar",
    location: "Whitefield",
  },
  {
    id: 4,
    quote: "I was nervous about selling my phone online as the condition was really good but Fhoneify made it simple with no hassles and great customer support.",
    author: "Shubham Ghunawat",
    location: "Jayanagar",
  }
];

const initials = (name: string) => name.split(' ').map((part) => part[0]).slice(0, 2).join('');

export default function CustomerStories() {
  return (
    <section aria-labelledby="stories-title" className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
      <h2 id="stories-title" className="font-display text-[1.9rem] font-medium leading-tight tracking-[-0.02em] text-foreground md:text-[2.5rem]">
        From sellers across Bengaluru
      </h2>

      {/* Swipeable row on phones, grid from tablet up. Native scroll, no auto-play. */}
      <ul className="hide-scrollbar -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-4">
        {TESTIMONIALS.map((item) => (
          <li
            key={item.id}
            className="flex w-[82%] shrink-0 snap-start flex-col justify-between rounded-2xl border border-border bg-surface p-6 sm:w-[60%] md:w-auto"
          >
            <blockquote className="text-[1.02rem] leading-relaxed text-foreground">&ldquo;{item.quote}&rdquo;</blockquote>
            <div className="mt-6 flex items-center gap-3">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-soft text-sm font-semibold text-gold">
                {initials(item.author)}
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-foreground">{item.author}</p>
                <p className="mt-0.5 text-xs uppercase tracking-[0.12em] text-muted">{item.location}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
