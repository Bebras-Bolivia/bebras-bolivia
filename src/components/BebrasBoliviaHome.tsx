import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";

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
    <div className="relative text-primary-foreground pt-4 pb-4 sm:pt-6 sm:pb-6">
      <main className="mx-auto w-full max-w-6xl px-4 md:px-6">
        <section
          id="inicio"
          ref={heroSectionRef}
          className="grid items-center gap-6 overflow-hidden py-6 sm:py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4 xl:overflow-visible"
        >
          <div data-hero-item className="order-1 space-y-3 text-center lg:text-left lg:col-start-1 lg:row-start-1">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <span className="h-px w-10 bg-primary-foreground/50"></span>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary-foreground/80">{hero.eyebrow || "Edición 2026"}</span>
            </div>
            <p
              className="text-[clamp(1.5rem,6vw,2.25rem)] italic text-primary-foreground/90 sm:text-4xl"
              style={{ fontFamily: "'Pacifico', cursive" }}
            >
              {hero.welcomeText || "Bienvenido a"}
            </p>
            <h1
              className="text-[clamp(2.5rem,11vw,4rem)] leading-[0.95] text-primary-foreground sm:text-7xl"
              style={{ fontFamily: "'Pacifico', cursive" }}
            >
              {hero.title || "Bebras Bolivia 2026"}
            </h1>
          </div>

          <div className="order-2 mt-8 sm:mt-6 lg:mt-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <BebrasBeaverShowcase />
          </div>

          <div data-hero-item className="order-3 space-y-4 text-center lg:text-left lg:col-start-1 lg:row-start-2">
            <p className="mx-auto max-w-[28ch] text-balance text-lg leading-snug text-primary-foreground sm:text-2xl lg:mx-0 pt-4">
              {hero.subtitlePrimary || "El desafío internacional de pensamiento computacional para estudiantes de todo el país."}
            </p>
            <p className="mx-auto max-w-[28ch] text-balance text-lg leading-snug text-primary-foreground/80 sm:text-2xl lg:mx-0">
              {hero.subtitleSecondary || "Inscribe a tu unidad educativa y participa junto a más de 70 países."}
            </p>
            <div className="pt-2">
              <Button
                className="h-14 w-full max-w-xs rounded-2xl border border-primary-foreground/30 bg-primary-foreground px-6 text-base font-extrabold text-primary transition hover:!bg-primary-foreground/90 focus-visible:!bg-primary-foreground active:!bg-primary-foreground lg:mx-0"
                asChild
              >
                <a
                  href={hero.buttonHref || "/registro"}
                  className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap leading-none"
                >
                  <span>{hero.buttonLabel || "Regístrate aquí"}</span>
                  <ArrowRight className="size-5" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        {latestNews && (
          <section data-hero-item className="mx-auto mt-6 w-full max-w-6xl pb-6 sm:mt-8 sm:pb-8">
            <div className="relative flex items-center gap-5 rounded-2xl bg-card/95 px-6 py-5 text-foreground shadow-[0_2px_0_rgba(0,0,0,0.04),0_20px_40px_-25px_rgba(0,0,0,0.2)] ring-1 ring-border/70 backdrop-blur-sm sm:px-8 sm:py-6">
              <span className="relative flex shrink-0 items-center justify-center">
                <span className="absolute inline-flex size-4 rounded-full bg-primary opacity-75 animate-ping"></span>
                <span className="relative inline-flex size-2.5 rounded-full bg-primary"></span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-ochre">
                  Última noticia
                  <time dateTime={latestNews.dateTime}> · {latestNews.dateLabel}</time>
                </p>
                <p className="text-base font-semibold leading-snug text-foreground sm:text-lg">
                  {latestNews.title}
                </p>
                {latestNews.author && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {latestNews.author}
                  </p>
                )}
              </div>
              <a
                href={latestNews.href}
                className="hidden shrink-0 items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-xs font-bold tracking-wide text-primary-foreground transition-colors duration-300 hover:bg-primary/90 sm:inline-flex"
              >
                Leer noticia
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
