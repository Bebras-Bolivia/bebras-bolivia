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
}

export default function MobileMenu({ links, currentPath: initialPath }: Props) {
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
        className="relative inline-flex items-center justify-center size-9 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200 cursor-pointer lg:hidden overflow-hidden"
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
            className={`fixed inset-0 top-16 z-40 lg:hidden overflow-y-auto transition-all duration-300 ${
              visible
                ? "bg-background opacity-100"
                : "bg-background/0 opacity-0"
            }`}
            style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <nav
              className={`flex flex-col gap-1 p-6 transition-transform duration-300 ${
                visible ? "translate-y-0" : "-translate-y-4"
              }`}
              style={{ transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
            >
              <p
                className={`text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground mb-4 transition-all duration-300 ${
                  visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                }`}
                style={{
                  transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: visible ? "50ms" : "0ms",
                }}
              >
                Navegacion
              </p>
              {links.map((link, i) => {
                const isActive =
                  currentPath === link.href ||
                  (link.href !== "/" && currentPath.startsWith(link.href));
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className={`block rounded-lg px-4 py-3 text-base font-medium transition-all duration-300 ${
                      isActive
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-foreground hover:bg-accent hover:translate-x-1"
                    } ${
                      visible
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-3"
                    }`}
                    style={{
                      transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                      transitionDelay: visible ? `${80 + i * 40}ms` : "0ms",
                    }}
                    onClick={closeMenu}
                  >
                    {link.label}
                  </a>
                );
              })}
              <div
                className={`mt-6 pt-4 border-t border-border transition-all duration-300 ${
                  visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3"
                }`}
                style={{
                  transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                  transitionDelay: visible ? `${80 + links.length * 40}ms` : "0ms",
                }}
              >
                <a
                  href="/registro"
                  className="block rounded-lg bg-primary px-4 py-3.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/10 transition-all duration-200"
                  onClick={closeMenu}
                >
                  Inscribirse
                </a>
              </div>
            </nav>
          </div>,
          document.body
        )}
    </>
  );
}
