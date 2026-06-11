import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import castorCircle from "@/assets/castor-circle.png";
import navData from "@/data/navigation.json";
import MobileMenu from "./MobileMenu";

interface Props {
  currentPath?: string;
}

export default function BebrasHeader({ currentPath: initialPath = "/" }: Props) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const castorRef = useRef<HTMLImageElement>(null);
  const headerShellRef = useRef<HTMLElement>(null);

  // Update currentPath on Astro client-side navigation
  useEffect(() => {
    function onPageLoad() {
      setCurrentPath(window.location.pathname);
    }
    document.addEventListener("astro:page-load", onPageLoad);
    return () => document.removeEventListener("astro:page-load", onPageLoad);
  }, []);

  // GSAP castor coin-flip animation (teammate's design)
  useEffect(() => {
    const castorNode = castorRef.current;
    if (!castorNode) return;

    gsap.set(castorNode, {
      transformStyle: "preserve-3d",
      transformPerspective: 900,
      transformOrigin: "50% 50%",
      backfaceVisibility: "visible",
    });

    let timeoutId: number | null = null;
    let isCancelled = false;

    const spinOnce = () => {
      gsap.to(castorNode, {
        keyframes: [
          { rotateY: "+=90", scaleX: 0.25, duration: 0.9, ease: "power1.in" },
          { rotateY: "+=180", scaleX: 1, duration: 1.8, ease: "power1.inOut" },
          { rotateY: "+=90", scaleX: 0.25, duration: 0.9, ease: "power1.out" },
          { scaleX: 1, duration: 0.35, ease: "power2.out" },
        ],
        duration: 3.95,
        overwrite: "auto",
        onComplete: () => {
          if (!isCancelled) schedule();
        },
      });
    };

    const schedule = () => {
      const waitMs = gsap.utils.random(4500, 9000, 1);
      timeoutId = window.setTimeout(spinOnce, waitMs);
    };

    schedule();

    return () => {
      isCancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      gsap.killTweensOf(castorNode);
    };
  }, []);

  useEffect(() => {
    const headerShell = headerShellRef.current;
    if (!headerShell) return;

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const desktopQuery = window.matchMedia("(min-width: 1024px)");
      const showAnim = gsap
        .from(headerShell, {
          yPercent: -140,
          paused: true,
          duration: 0.24,
          ease: "power2.out",
        })
        .progress(1);

      ScrollTrigger.create({
        start: "top top",
        end: "max",
        onUpdate: (self) => {
          if (!desktopQuery.matches) {
            showAnim.progress(1);
            return;
          }

          if (self.scroll() < 12) {
            showAnim.progress(1);
            return;
          }

          if (self.direction === -1) {
            showAnim.play();
          } else {
            showAnim.reverse();
          }
        },
      });
    }, headerShell);

    return () => ctx.revert();
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return currentPath === "/";
    return currentPath === href || currentPath.startsWith(href + "/");
  };

  const allLinks = navData.links;

  return (
    <header ref={headerShellRef} className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4 md:px-6">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl bg-bebras-paper px-3 py-2.5 sm:px-4 sm:py-3">
          {/* Logo */}
          <a className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3 lg:flex-none" href="/">
            <img
              ref={castorRef}
              src={castorCircle.src}
              alt="Castor Bebras Bolivia"
              className="size-9 rounded-full object-cover sm:size-12"
            />
            <div className="min-w-0">
              <p
                className="font-display text-[clamp(1.15rem,5.2vw,1.8rem)] font-bold uppercase leading-[0.9] text-bebras-green sm:text-[1.8rem]"
              >
                <span className="block">{navData.brand.name}</span>
                <span className="block">{navData.brand.suffix}</span>
              </p>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden min-w-0 flex-1 items-center justify-end gap-3 font-medium text min-[1180px]:gap-5 lg:flex xl:gap-6">
            {allLinks.map((link) => (
              <a
                key={link.href}
                className={`relative shrink-0 py-1 text-[clamp(0.82rem,1.15vw,1rem)] transition-colors ${
                  isActive(link.href)
                    ? "text-primary font-medium after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary"
                    : "text-foreground/75 hover:text-primary after:absolute after:-bottom-1 after:left-1/2 after:h-[2px] after:w-0 after:-translate-x-1/2 after:rounded-full after:bg-primary/50 after:transition-all after:duration-300 hover:after:w-full"
                }`}
                href={link.href}
              >
                {link.label}
              </a>
            ))}
            {navData.cta && (
              <a
                href={navData.cta.href}
                className="shrink-0 rounded-2xl bg-bebras-red px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-bebras-red/20 transition-all duration-200 hover:bg-bebras-red-dark min-[1180px]:px-4"
              >
                {navData.cta.label}
              </a>
            )}
          </nav>

          {navData.cta && (
            <a
              href={navData.cta.href}
              className="mr-2 hidden rounded-2xl bg-bebras-red px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-bebras-red-dark min-[560px]:inline-flex lg:hidden"
            >
              {navData.cta.label}
            </a>
          )}

          {/* Mobile menu */}
          <MobileMenu links={allLinks} currentPath={currentPath} cta={navData.cta} />
        </div>
      </div>
    </header>
  );
}
