import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BebrasBeaverShowcase } from "@/components/BebrasBeaverShowcase";

type HomeHeroData = {
  eyebrow?: string;
  welcomeText?: string;
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
  dateTime: string;
  dateLabel: string;
};

export default function BebrasBoliviaHome({ hero = {}, latestNews }: { hero?: HomeHeroData; latestNews?: LatestNewsData | null }) {
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
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="white" opacity="0.25">
          {Array.from({ length: 7 }).map((_, row) =>
            Array.from({ length: 7 }).map((_, col) => (
              <circle key={`tl-${row}-${col}`} cx={40 + col * 18} cy={140 + row * 18} r={1.8} />
            ))
          )}
        </g>
        <g fill="white" opacity="0.25">
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 5 }).map((_, col) => (
              <circle key={`br-${row}-${col}`} cx={1280 + col * 18} cy={680 + row * 18} r={1.8} />
            ))
          )}
        </g>

        <circle cx="180" cy="500" r="14" fill="var(--color-bebras-blue)" className="shape-float-slow" />
        <circle cx="1330" cy="220" r="10" fill="var(--color-bebras-blue)" className="shape-float-medium" />
        <circle cx="260" cy="800" r="8" fill="var(--color-bebras-blue)" className="shape-bob" />

        <rect x="1100" y="160" width="26" height="26" rx="6" fill="var(--color-bebras-green)" className="shape-spin-slow" />
        <rect x="80" y="700" width="20" height="20" rx="5" fill="none" stroke="var(--color-bebras-blue)" strokeWidth="3" className="shape-spin-slow" />

        <polygon points="1240,420 1262,460 1218,460" fill="var(--color-bebras-red)" className="shape-float-slow" />
        <polygon points="120,360 140,392 100,392" fill="none" stroke="white" strokeWidth="3" strokeOpacity="0.5" className="shape-float-medium" />

        <path d="M 950 760 Q 970 740 990 760 T 1030 760" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.55" className="shape-bob" />
        <path d="M 1180 540 L 1220 540 M 1200 520 L 1200 560" stroke="var(--color-bebras-green)" strokeWidth="3.5" strokeLinecap="round" className="shape-float-medium" />
        <path d="M 320 240 L 360 240 M 340 220 L 340 260" stroke="var(--color-bebras-red)" strokeWidth="3.5" strokeLinecap="round" className="shape-float-slow" />

        <circle cx="100" cy="450" r="22" fill="none" stroke="var(--color-bebras-blue)" strokeWidth="2.5" strokeDasharray="4 6" className="shape-spin-slow" />
        <circle cx="1340" cy="540" r="18" fill="none" stroke="var(--color-bebras-green)" strokeWidth="2.5" strokeDasharray="3 5" className="shape-spin-slow" />
      </svg>

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
              Bienvenido a{" "}
              <span className="relative inline-block">
                <span className="relative z-10">Bebras</span>
                <span className="absolute inset-x-0 bottom-1 h-3 bg-bebras-red z-0 sm:bottom-2 sm:h-4"></span>
              </span>{" "}
              <span className="text-bebras-green">Bolivia</span>
            </h1>

            <p className="mx-auto max-w-[42ch] text-balance text-lg leading-relaxed text-white/90 sm:text-xl lg:mx-0">
              {hero.subtitlePrimary || "El desafío internacional de pensamiento computacional para estudiantes de todo el país."}
            </p>

            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center lg:justify-start">
              <Button
                className="h-14 rounded-2xl bg-bebras-red px-8 text-base font-extrabold text-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-bebras-red-dark! hover:shadow-[0_14px_30px_-8px_rgba(0,0,0,0.4)]"
                asChild
              >
                <a
                  href={hero.buttonHref || "/registro"}
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

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-4 lg:justify-start">
              <div className="flex items-baseline gap-2">
                <span className="serif-display text-3xl text-white">70+</span>
                <span className="text-sm text-white/85">países</span>
              </div>
              <div className="h-5 w-px bg-white/40"></div>
              <div className="flex items-baseline gap-2">
                <span className="serif-display text-3xl text-white">45<span className="text-lg">min</span></span>
                <span className="text-sm text-white/85">por desafío</span>
              </div>
              <div className="h-5 w-px bg-white/40"></div>
              <div className="flex items-baseline gap-2">
                <span className="serif-display text-3xl text-white">5</span>
                <span className="text-sm text-white/85">categorías</span>
              </div>
            </div>
          </div>

          <div data-hero-item className="relative order-2 flex items-center justify-center">
            <div className="relative aspect-square w-full max-w-[34rem]">
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-bebras-green"
              />
              <span
                aria-hidden="true"
                className="absolute -right-3 top-12 size-20 rounded-2xl bg-white rotate-12 shadow-lg sm:size-24"
              />
              <span
                aria-hidden="true"
                className="absolute -left-2 bottom-16 size-16 rounded-full bg-bebras-red shadow-lg sm:size-20"
              />
              <div className="relative z-10 flex h-full w-full items-center justify-center">
                <BebrasBeaverShowcase />
              </div>
            </div>
          </div>
        </section>

        {latestNews && (
          <div data-hero-item className="pointer-events-none absolute inset-x-4 bottom-2 z-20 flex justify-center sm:bottom-4 lg:inset-x-auto lg:left-8 lg:justify-start">
            <a
              href={latestNews.href}
              className="pointer-events-auto relative flex max-w-[min(28rem,100%)] items-center gap-2.5 rounded-full bg-white/88 px-3.5 py-2 text-bebras-ink shadow-[0_12px_26px_-22px_rgba(0,0,0,0.45)] ring-1 ring-white/70 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white"
            >
              <span className="relative flex shrink-0 items-center justify-center" aria-hidden="true">
                <span className="absolute inline-flex size-2.5 rounded-full bg-bebras-red opacity-70 animate-ping"></span>
                <span className="relative inline-flex size-1.5 rounded-full bg-bebras-red"></span>
              </span>
              <span className="hidden shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-bebras-red sm:inline">
                Noticia
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold sm:text-sm">
                {latestNews.title}
              </span>
              <time className="hidden shrink-0 text-[11px] font-semibold text-bebras-ink/50 md:inline" dateTime={latestNews.dateTime}>
                {latestNews.dateLabel}
              </time>
              <span className="shrink-0 text-xs font-bold text-bebras-green">
                <span aria-hidden="true">→</span>
              </span>
            </a>
          </div>
        )}
      </main>

      <div className="relative z-10 flex justify-center pb-6 sm:pb-8">
        <a
          href="#contenido"
          aria-label="Desplazarse hacia abajo"
          className="group inline-flex flex-col items-center gap-1 text-white/85 transition-colors hover:text-white"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.32em]">Desplazar</span>
          <ChevronDown className="size-7 animate-bounce" strokeWidth={2.2} aria-hidden="true" />
        </a>
      </div>

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
