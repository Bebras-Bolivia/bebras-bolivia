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

    let onAfterSwap: (() => void) | null = null;

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

      let lastScroll = ScrollTrigger.maxScroll(window) ? window.scrollY : 0;

      // Snap the header to fully visible. `.progress(1)` alone is not enough:
      // after a `reverse()` the tween stays unpaused in the reverse direction,
      // so moving the playhead would make GSAP resume playing backwards and
      // slide the header away again on its own. Pausing stops that; the next
      // play()/reverse() unpauses as usual.
      const showInstantly = () => {
        showAnim.progress(1).pause();
      };

      ScrollTrigger.create({
        start: "top top",
        end: "max",
        onUpdate: (self) => {
          const scroll = self.scroll();

          // On mobile, or near the top of the page, always keep it visible.
          if (!desktopQuery.matches || scroll < 12) {
            lastScroll = scroll;
            showInstantly();
            return;
          }

          // Only react to a real change in scroll position, comparing against
          // our own last value instead of self.direction, which can be stale
          // (e.g. right after a navigation / ScrollTrigger refresh) and hide
          // the header without the user having scrolled.
          const delta = scroll - lastScroll;
          lastScroll = scroll;

          if (delta < -1) {
            showAnim.play(); // scrolling up -> show
          } else if (delta > 1) {
            showAnim.reverse(); // scrolling down -> hide
          }
        },
      });

      // The header persists across Astro client-side navigations
      // (transition:persist), so if it was hidden on the previous page it
      // stays hidden on the new one: the ClientRouter scroll reset doesn't
      // reach the ScrollTrigger update. Force it visible after each swap.
      onAfterSwap = () => {
        lastScroll = window.scrollY;
        showInstantly();
      };
      document.addEventListener("astro:after-swap", onAfterSwap);
    }, headerShell);

    return () => {
      if (onAfterSwap) document.removeEventListener("astro:after-swap", onAfterSwap);
      ctx.revert();
    };
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
                <span className="block">Bebras</span>
                <span className="block">Bolivia</span>
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
