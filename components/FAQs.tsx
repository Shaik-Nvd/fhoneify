import { Plus } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'How do I know the price of my old phone?',
    a: 'Our smart AI-based pricing engine evaluates your phone based on its make, model, age, and condition. Simply answer a few quick questions about your device to get an instant, competitive quote.'
  },
  {
    q: 'Can I cancel my sale if I change my mind?',
    a: 'Yes, absolutely. You are under no obligation to sell until the pickup executive physically inspects and collects your device, so you can change your mind at any point before the handover.'
  },
  {
    q: 'How and when will I get paid?',
    a: 'You receive your payment instantly at the time of pickup! Our executive will transfer the agreed amount via UPI or bank transfer directly to your account before leaving with the device.'
  }
];

export default function FAQs() {
  return (
    <div className="w-full">
      <h2 id="faq-title" className="font-display text-[1.9rem] font-medium leading-tight tracking-[-0.02em] text-foreground md:text-[2.5rem]">
        Questions, answered
      </h2>

      <div className="mt-8 border-b border-border">
        {FAQ_ITEMS.map((item, idx) => (
          <details key={item.q} className="group border-t border-border" open={idx === 0}>
            <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-6 py-4 text-left text-[1.02rem] font-semibold text-foreground transition-colors hover:text-gold [&::-webkit-details-marker]:hidden">
              {item.q}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-transform duration-200 group-open:rotate-45 group-open:border-gold group-open:text-gold">
                <Plus aria-hidden="true" className="h-4 w-4" />
              </span>
            </summary>
            <p className="max-w-[62ch] pb-6 pr-12 leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
