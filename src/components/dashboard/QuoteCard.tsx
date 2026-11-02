import type { Quote } from "@/lib/quotes";

export function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <figure className="relative flex flex-col justify-end overflow-hidden rounded-[28px] bg-navy px-7 py-7 text-white sm:px-9 sm:py-8">
      <svg className="pointer-events-none absolute -right-10 -top-10 opacity-[0.16]" width="220" height="220" viewBox="0 0 220 220" aria-hidden>
        <circle cx="110" cy="110" r="96" fill="none" stroke="var(--work)" strokeWidth="22" />
        <circle cx="110" cy="110" r="62" fill="none" stroke="var(--health)" strokeWidth="22" />
        <circle cx="110" cy="110" r="28" fill="none" stroke="var(--personal)" strokeWidth="22" />
      </svg>
      <blockquote className="relative max-w-[30ch] font-serif text-[30px] leading-[1.12] sm:text-[40px]">
        „{quote.text}”
      </blockquote>
      <figcaption className="relative mt-4 text-[14px] text-white/60">{quote.author}</figcaption>
    </figure>
  );
}
