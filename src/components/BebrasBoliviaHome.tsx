import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BebrasBeaverShowcase } from "@/components/BebrasBeaverShowcase";

export default function BebrasBoliviaHome() {
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
      <main className="mx-auto w-full px-4 md:max-w-9/12 md:px-6">
        <section
          id="inicio"
          ref={heroSectionRef}
          className="grid items-center gap-6 py-6 sm:py-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4"
        >
          <div data-hero-item className="order-1 space-y-3 text-center lg:text-left lg:col-start-1 lg:row-start-1">
            <div className="flex items-center justify-center lg:justify-start gap-3">
              <span className="h-px w-10 bg-primary-foreground/50"></span>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary-foreground/80">Edición 2026</span>
            </div>
            <p
              className="text-[clamp(1.5rem,6vw,2.25rem)] italic text-primary-foreground/90 sm:text-4xl"
              style={{ fontFamily: "'Pacifico', cursive" }}
            >
              Bienvenido a
            </p>
            <h1
              className="text-[clamp(2.5rem,11vw,4rem)] leading-[0.95] text-primary-foreground sm:text-7xl"
              style={{ fontFamily: "'Pacifico', cursive" }}
            >
              Bebras Bolivia 2026
            </h1>
          </div>

          <div className="order-2 mt-8 sm:mt-6 lg:mt-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <BebrasBeaverShowcase />
          </div>

          <div data-hero-item className="order-3 space-y-4 text-center lg:text-left lg:col-start-1 lg:row-start-2">
            <p className="mx-auto max-w-[28ch] text-balance text-lg leading-snug text-primary-foreground sm:text-2xl lg:mx-0 pt-4">
              El desafío internacional de pensamiento computacional para estudiantes de todo el país.
            </p>
            <p className="mx-auto max-w-[28ch] text-balance text-lg leading-snug text-primary-foreground/80 sm:text-2xl lg:mx-0">
              Inscribe a tu unidad educativa y participa junto a más de 70 países.
            </p>
            <div className="pt-2">
              <Button
                className="h-14 w-full max-w-xs rounded-2xl border border-black/10 bg-card px-6 text-base font-extrabold text-card-foreground transition hover:!bg-card focus-visible:!bg-card active:!bg-card lg:mx-0"
                asChild
              >
                <a
                  href="/registro"
                  className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap leading-none"
                >
                  <span>Regístrate aquí</span>
                  <ArrowRight className="size-5" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section data-hero-item className="mx-auto mt-6 w-full max-w-5xl pb-6 sm:mt-8 sm:pb-8">
          <div className="relative flex items-center gap-5 rounded-[1.75rem] bg-card/95 px-6 py-5 text-foreground shadow-[0_2px_0_rgba(0,0,0,0.04),0_20px_40px_-25px_rgba(0,0,0,0.2)] ring-1 ring-border/70 backdrop-blur-sm sm:px-8 sm:py-6">
            <span className="relative flex shrink-0 items-center justify-center">
              <span className="absolute inline-flex size-4 rounded-full bg-primary opacity-75 animate-ping"></span>
              <span className="relative inline-flex size-2.5 rounded-full bg-primary"></span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-1 font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-ochre">
                Edición 2026 - Inscripciones abiertas
              </p>
              <p className="text-base font-semibold leading-snug text-foreground sm:text-lg">
                El desafío vuelve en noviembre. Prepara tu unidad educativa.
              </p>
            </div>
            <a
              href="/registro"
              className="hidden shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-bold tracking-wide text-background transition-colors duration-300 hover:bg-primary sm:inline-flex"
            >
              Inscribir
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
