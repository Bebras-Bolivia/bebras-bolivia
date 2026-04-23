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
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        className="relative inline-flex size-10 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-primary transition-all duration-200 hover:bg-primary/25 lg:hidden"
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

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 top-20 z-40 overflow-y-auto px-4 pb-6 pt-1 transition-all duration-300 lg:hidden ${
              visible
                ? "bg-transparent opacity-100"
                : "bg-transparent opacity-0"
            }`}
            style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div
              className={`mx-auto flex w-full max-w-[420px] flex-col gap-2 transition-transform duration-300 ${
                visible ? "translate-y-0" : "-translate-y-4"
              }`}
              style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
            >
              <nav
                className={`overflow-hidden rounded-xl border border-border/70 bg-card transition-all duration-300 ${
                  visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                }`}
                style={{
                  transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: visible ? "40ms" : "0ms",
                }}
              >
                <div className="flex flex-col gap-2 p-3">
                {links.map((link, i) => {
                  const isContact =
                    link.href === "/contacto" ||
                    link.label.toLowerCase().includes("contact");
                  if (isContact) return null;

                  const isActive =
                    currentPath === link.href ||
                    (link.href !== "/" && currentPath.startsWith(link.href));

                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      className={`flex min-h-14 items-center rounded-lg px-4 py-3 text-[1.9rem] font-medium leading-none transition-all duration-300 sm:text-[2rem] ${
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
                  <div className="p-3">
                    <a
                      href={cta.href}
                      className="flex min-h-14 items-center justify-center rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/10 transition-all duration-200 hover:bg-primary/90"
                      onClick={closeMenu}
                    >
                      {cta.label}
                    </a>
                  </div>
                )}
              </nav>

              {links
                .filter(
                  (link) =>
                    link.href === "/contacto" ||
                    link.label.toLowerCase().includes("contact")
                )
                .map((link, i) => {
                const isActive =
                  currentPath === link.href ||
                  (link.href !== "/" && currentPath.startsWith(link.href));
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`block rounded-xl border border-border/70 bg-card px-4 py-3 text-[1.9rem] font-medium leading-none transition-all duration-300 sm:text-[2rem] ${
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
                      transitionDelay: visible ? `${90 + (links.length + i) * 35}ms` : "0ms",
                    }}
                    onClick={closeMenu}
                  >
                    {link.label}
                  </a>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
