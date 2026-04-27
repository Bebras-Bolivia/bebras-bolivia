import { useEffect, useState, useCallback } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

interface Slide {
  title: string;
  description: string;
  link: string;
  linkText: string;
  tag: string;
}

interface Props {
  slides: Slide[];
}

export default function NewsCarousel({ slides }: Props) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, onSelect]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (!api) return;
    const interval = setInterval(() => {
      api.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [api]);

  return (
    <section className="relative border-y border-primary-foreground/25 bg-primary text-primary-foreground">
      {/* Accent top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Carousel
          setApi={setApi}
          opts={{ loop: true, align: "start" }}
          className="w-full"
        >
          <CarouselContent>
            {slides.map((slide, i) => (
              <CarouselItem key={i}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center rounded-2xl bg-primary-foreground/15 px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-primary-foreground">
                        {slide.tag}
                      </span>
                      <span className="h-px flex-1 bg-primary-foreground/25 max-w-16" />
                    </div>
                    <h3 className="text-base font-bold text-primary-foreground">
                      {slide.title}
                    </h3>
                    <p className="text-sm text-primary-foreground/75 mt-1.5 max-w-xl leading-relaxed">
                      {slide.description}
                    </p>
                  </div>
                  <a
                    href={slide.link}
                    className="group inline-flex shrink-0 items-center justify-center rounded-2xl border border-primary-foreground/25 bg-primary-foreground px-5 py-2.5 text-sm font-semibold text-primary transition-all duration-200 hover:bg-primary-foreground/90"
                  >
                    {slide.linkText}
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 transition-transform group-hover:translate-x-0.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </a>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => api?.scrollTo(i)}
                aria-label={`Ir a noticia ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  current === i
                    ? "bg-primary-foreground w-6"
                    : "w-1.5 bg-primary-foreground/30 hover:bg-primary-foreground/45"
                }`}
              />
            ))}
          </div>
        </Carousel>
      </div>
    </section>
  );
}
