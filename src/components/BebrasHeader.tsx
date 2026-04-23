import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import castorCircle from "@/assets/castor-circle.png";
import navData from "@/data/navigation.json";
import customPagesData from "@/data/custom-pages.json";
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

  const customHeaderLinks = (customPagesData.pages || [])
    .filter((p) => p.showInHeader)
    .map((p) => ({ label: p.navLabel || p.title, href: `/${p.slug}` }));

  const allLinks = [...navData.links, ...customHeaderLinks];

  return (
    <header ref={headerShellRef} className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6">
      <div className="mx-auto flex w-full items-center justify-between md:max-w-9/12">
        <div className="flex flex-1 items-center justify-between rounded-xl bg-card px-3 py-2.5 sm:px-4 sm:py-3">
          {/* Logo */}
          <a className="flex min-w-0 items-center gap-2.5 sm:gap-3" href="/">
            <img
              ref={castorRef}
              src={castorCircle.src}
              alt="Castor Bebras Bolivia"
              className="size-9 rounded-full object-cover sm:size-12"
            />
            <div className="min-w-0">
              <p
                className="text-[2rem] leading-[0.9] text-primary sm:text-4xl sm:leading-tight"
                style={{ fontFamily: "'Pacifico', cursive" }}
              >
                {navData.brand.name} {navData.brand.suffix}
              </p>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 font-medium text lg:flex">
            {allLinks.map((link) => (
              <a
                key={link.href}
                className={`relative transition-colors py-1 ${
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
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/10 transition-all duration-200"
              >
                {navData.cta.label}
              </a>
            )}
          </nav>

          {navData.cta && (
            <a
              href={navData.cta.href}
              className="mr-2 hidden rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-secondary/80 min-[560px]:inline-flex lg:hidden"
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
