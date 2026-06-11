import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";

interface NavLink {
  label: string;
  href: string;
}

interface Props {
  links: NavLink[];
  currentPath: string;
  cta?: NavLink;
}

export default function MobileMenu({ links, currentPath: initialPath, cta }: Props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [mounted, setMounted] = useState(false);
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The header has a CSS transform (GSAP show/hide), which creates a stacking
  // context that traps a `fixed` child. Portal the overlay+menu to <body> so it
  // escapes that context and its z-index applies against the viewport.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update currentPath on client-side navigation (Astro ClientRouter)
  useEffect(() => {
    function onPageLoad() {
      setCurrentPath(window.location.pathname);
      setOpen(false);
      setVisible(false);
    }
    document.addEventListener("astro:page-load", onPageLoad);
    return () => document.removeEventListener("astro:page-load", onPageLoad);
  }, []);

  const openMenu = useCallback(() => {
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setOpen(true);
    // Trigger enter animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  }, []);

  const closeMenu = useCallback(() => {
    setVisible(false);
    // Wait for exit animation before unmounting
    closeTimeout.current = setTimeout(() => {
      setOpen(false);
      closeTimeout.current = null;
    }, 300);
  }, []);

  const toggleMenu = useCallback(() => {
    if (open && visible) {
      closeMenu();
    } else if (!open) {
      openMenu();
    }
  }, [open, visible, openMenu, closeMenu]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
    };
  }, []);

  return (
    <>
      <button
        onClick={toggleMenu}
        aria-label={open ? "Cerrar menu" : "Abrir menu"}
        aria-expanded={open}
        aria-controls="mobile-navigation-menu"
        className="relative inline-flex size-10 items-center justify-center overflow-hidden rounded-2xl bg-primary/20 text-primary transition-all duration-200 hover:bg-primary/25 lg:hidden"
      >
        <Menu
          className={`size-5 absolute transition-all duration-300 ${
            open
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
        <X
          className={`size-5 absolute transition-all duration-300 ${
            open
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </button>

      {open && mounted && createPortal(
        <>
          <div
            className={`fixed inset-0 z-[80] bg-black/10 transition-opacity duration-300 lg:hidden ${
              visible ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div
            id="mobile-navigation-menu"
            className={`fixed inset-x-0 bottom-0 top-[5.75rem] z-[90] overflow-hidden px-3 pb-4 pt-1 transition-all duration-300 sm:top-[6.5rem] sm:px-4 lg:hidden ${
              visible
                ? "bg-transparent opacity-100"
                : "bg-transparent opacity-0"
            }`}
            style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div
              className={`mx-auto flex h-full w-full max-w-2xl flex-col transition-transform duration-300 ${
                visible ? "translate-y-0" : "-translate-y-4"
              }`}
              style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
            >
              <nav
                className={`max-h-full overflow-y-auto rounded-2xl border border-border/70 bg-card shadow-[0_10px_26px_rgba(35,31,32,0.12)] transition-all duration-300 ${
                  visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                }`}
                aria-label="Navegacion movil"
                style={{
                  transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: visible ? "40ms" : "0ms",
                }}
              >
                <div className="flex flex-col gap-1.5 p-3">
                {links.map((link, i) => {
                  const isActive =
                    currentPath === link.href ||
                    (link.href !== "/" && currentPath.startsWith(link.href));

                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className={`flex min-h-11 items-center rounded-2xl px-4 py-2.5 text-[clamp(1.25rem,6vw,1.85rem)] font-medium leading-none transition-all duration-300 sm:min-h-12 ${
                        isActive
                          ? "text-primary"
                          : "text-foreground hover:bg-foreground/5"
                      } ${
                        visible
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-3"
                      }`}
                      style={{
                        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                        transitionDelay: visible ? `${70 + i * 35}ms` : "0ms",
                      }}
                      onClick={closeMenu}
                    >
                      {link.label}
                    </a>
                  );
                })}
                </div>
                {cta && (
                  <div className="border-t border-border/70 p-3">
                    <a
                      href={cta.href}
                      className="flex min-h-11 items-center justify-center rounded-2xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/10 transition-all duration-200 hover:bg-primary/90"
                      onClick={closeMenu}
                    >
                      {cta.label}
                    </a>
                  </div>
                )}
              </nav>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
