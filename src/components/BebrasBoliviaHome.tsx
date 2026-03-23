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
    <div className="relative text-primary-foreground py-10">
      <main className="mx-auto w-full px-4 pb-16 md:max-w-9/12 md:px-6">
        <section
          id="inicio"
          ref={heroSectionRef}
          className="grid min-h-[78vh] items-center gap-8 py-8 sm:py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4"
        >
          <div data-hero-item className="order-1 space-y-5 text-center lg:text-left lg:col-start-1 lg:row-start-1">
            <p className="text-[clamp(2rem,8.5vw,2.75rem)] font-black tracking-tight text-primary-foreground sm:text-5xl">
              Bienvenido a
            </p>
            <h1
              className="text-[clamp(2.9rem,13.2vw,4.5rem)] leading-[0.95] text-primary-foreground sm:text-7xl"
              style={{ fontFamily: "'Pacifico', cursive" }}
            >
              Bebras Bolivia 2026
            </h1>
          </div>

          <div className="order-2 mt-12 sm:mt-10 lg:mt-0 lg:col-start-2 lg:row-start-1 lg:row-span-2">
            <BebrasBeaverShowcase />
          </div>

          <div data-hero-item className="order-3 space-y-5 text-center lg:text-left lg:col-start-1 lg:row-start-2">
            <p className="mx-auto max-w-[20ch] text-balance text-xl leading-snug text-primary-foreground sm:text-4xl lg:mx-0 pt-6">
              El desafío internacional de pensamiento computacional para estudiantes de todo el país.
            </p>
            <p className="mx-auto max-w-[20ch] text-balance text-xl leading-snug text-primary-foreground/80 sm:text-4xl lg:mx-0">
              Inscribe a tu unidad educativa y participa junto a más de 70 países.
            </p>
            <div className="pt-3">
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
      </main>
    </div>
  );
}
