import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BebrasBeaverShowcase, type ShowcaseCategory } from "@/components/BebrasBeaverShowcase";
import { toSafeHref } from "@/lib/safe-url";

type HomeHeroData = {
  eyebrow?: string;
  title?: string;
  subtitlePrimary?: string;
  subtitleSecondary?: string;
  buttonLabel?: string;
  buttonHref?: string;
};

type LatestNewsData = {
  title: string;
  description?: string;
  author?: string;
  href: string;
};

// Render a plain title string while auto-styling the brand words: "Bebras"
// gets the red underline highlight and "Bolivia" gets the green accent. This
// keeps the CMS field a single, simple text input while preserving the design.
function renderHeroTitle(title: string) {
  return title.split(/(\s+)/).map((part, i) => {
    const word = part.trim().replace(/[.,;:!?]+$/, "").toLowerCase();
    if (word === "bebras") {
      return (
        <span key={i} className="relative inline-block">
          <span className="relative z-10">{part}</span>
          <span className="absolute inset-x-0 bottom-1 h-3 bg-bebras-red z-0 sm:bottom-2 sm:h-4"></span>
        </span>
      );
    }
    if (word === "bolivia") {
      return (
        <span key={i} className="text-bebras-green">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function BebrasBoliviaHome({ hero = {}, latestNews, showcaseCategories }: { hero?: HomeHeroData; latestNews?: LatestNewsData | null; showcaseCategories?: ShowcaseCategory[] }) {
  const heroSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (heroSectionRef.current) {
        gsap.fromTo(
          "[data-hero-item]",
          { y: 28, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.12,
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="relative -mt-25 flex min-h-svh flex-col overflow-hidden bg-bebras-yellow pt-25 text-white sm:-mt-29 sm:pt-29">
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 md:px-8 sm:py-10">
        <section
          id="inicio"
          ref={heroSectionRef}
          className="relative grid flex-1 grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16"
        >
          <div data-hero-item className="relative order-1 space-y-7 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-4 py-1.5 shadow-sm backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-white"></span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-white">
                {hero.eyebrow || "Edición 2026"}
              </span>
            </div>

            <h1 className="serif-display mx-auto max-w-[12ch] text-[clamp(2.5rem,8vw,5rem)] leading-[0.92] text-white sm:max-w-[11ch] lg:mx-0 lg:max-w-[11ch]">
              {renderHeroTitle(hero.title || "Bienvenido a Bebras Bolivia")}
            </h1>

            <p className="mx-auto max-w-[42ch] text-balance text-lg leading-relaxed text-white/90 sm:text-xl lg:mx-0">
              {hero.subtitlePrimary || "El desafío internacional de pensamiento computacional para estudiantes de todo el país."}
            </p>

            {hero.subtitleSecondary ? (
              <p className="mx-auto max-w-[42ch] text-balance text-base leading-relaxed text-white/75 lg:mx-0">
                {hero.subtitleSecondary}
              </p>
            ) : null}

            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center lg:justify-start">
              <Button
                className="h-14 rounded-2xl bg-bebras-red px-8 text-base font-extrabold text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-bebras-red-dark! hover:shadow-[0_14px_30px_-8px_rgba(0,0,0,0.4)]"
                asChild
              >
                <a
                  href={toSafeHref(hero.buttonHref, "/registro")}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap leading-none"
                >
                  <span>{hero.buttonLabel || "Inscribirme"}</span>
                  <ArrowRight className="size-5" />
                </a>
              </Button>
              <a
                href="/estudiantes"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-bebras-green px-8 text-base font-extrabold text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-bebras-green-dark hover:shadow-[0_14px_30px_-8px_rgba(0,0,0,0.4)]"
              >
                Conocer el desafío
              </a>
            </div>

          </div>

          <div data-hero-item className="relative order-2 flex items-center justify-center">
            <div className="relative aspect-square w-full max-w-[34rem]">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-bebras-green"
              />
              <div className="relative z-10 flex h-full w-full items-center justify-center">
                <BebrasBeaverShowcase categories={showcaseCategories} />
              </div>
            </div>
          </div>
        </section>

        {latestNews && (
          <div data-hero-item className="pointer-events-none absolute inset-x-4 bottom-2 z-20 flex justify-center sm:bottom-4 lg:inset-x-auto lg:left-8 lg:justify-start">
            <a
              href={toSafeHref(latestNews.href)}
              className="group pointer-events-auto relative flex max-w-[min(30rem,100%)] items-center gap-3 rounded-full bg-white/92 p-1.5 text-bebras-ink shadow-[0_14px_30px_-18px_rgba(0,0,0,0.5)] ring-1 ring-black/5 backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_34px_-18px_rgba(0,0,0,0.55)]"
            >
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bebras-red px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white">
                <span className="relative flex size-1.5" aria-hidden="true">
                  <span className="absolute inline-flex size-full rounded-full bg-white opacity-75 animate-ping"></span>
                  <span className="relative inline-flex size-1.5 rounded-full bg-white"></span>
                </span>
                Noticia
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">
                {latestNews.title}
              </span>
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-bebras-green/10 text-bebras-green transition-colors duration-300 group-hover:bg-bebras-green group-hover:text-white"
                aria-hidden="true"
              >
                <ChevronRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
              </span>
            </a>
          </div>
        )}
      </main>

      <svg
        aria-hidden="true"
        className="relative z-10 block h-12 w-full sm:h-16"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
      >
        <path
          d="M0,80 L0,40 Q360,0 720,40 T1440,40 L1440,80 Z"
          fill="var(--color-bebras-paper)"
        />
      </svg>
    </div>
  );
}
