import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BebrasBeaverShowcase } from "@/components/BebrasBeaverShowcase";

export default function BebrasBoliviaHome() {
  const heroTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (heroTextRef.current) {
        gsap.fromTo(
          heroTextRef.current.children,
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
    <div className="relative text-primary-foreground">
      <main className="mx-auto max-w-9/12 px-4 pb-16 md:px-6">
        <section
          id="inicio"
          className="grid min-h-[82vh] items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-4"
        >
          <div ref={heroTextRef} className="space-y-5 text-center lg:text-left">
            <p className="text-4xl font-black tracking-tight text-primary-foreground sm:text-5xl">
              Bienvenido a
            </p>
            <h1
              className="text-5xl leading-tight text-primary-foreground sm:text-7xl"
              style={{ fontFamily: "'Pacifico', cursive" }}
            >
              Bebras Bolivia 2026
            </h1>
            <p className="text-balance text-2xl leading-snug text-primary-foreground sm:text-4xl">
              El desafío internacional de pensamiento computacional para estudiantes de todo el país.
            </p>
            <p className="text-balance text-2xl leading-snug text-primary-foreground/80 sm:text-4xl">
              Inscribe a tu unidad educativa y participa junto a más de 70 países.
            </p>
            <div className="pt-3">
              <Button
                className="h-14 rounded-2xl bg-card px-10 text-base font-extrabold text-card-foreground transition hover:bg-card/90"
                asChild
              >
                <a href="#inicio">
                  Regístrate aquí <ArrowRight className="ml-2 size-5" />
                </a>
              </Button>
            </div>
          </div>

          <BebrasBeaverShowcase />
        </section>
      </main>
    </div>
  );
}
